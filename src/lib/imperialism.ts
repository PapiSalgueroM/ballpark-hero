import { applyMomentum, type MomentumCtx } from './conquestMomentum';
import { NFL_TEAMS, TEAM_MAP, STATE_GEO_COORDS, INITIAL_TERRITORIES } from '@/data/conquestData';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';

/**
 * NFL Imperialism mode (owner task 83, researched 2026-08-05; see
 * docs/CONQUEST_REWORK.md). The canonical imperialism-map rules:
 *
 *  - Start: every territory belongs to the team whose stadium is nearest
 *    (states-level Voronoi over the map's real territory splits).
 *  - Every game: the WINNER CONQUERS THE LOSER'S ENTIRE EMPIRE. Margin never
 *    matters.
 *  - A wiped-out team keeps playing its schedule, and one win takes its
 *    conqueror's whole empire back. Comebacks are the format's soul.
 *  - Our sim plays overtime, so ties (which change nothing in the format)
 *    cannot happen.
 *
 * Season: 18 random-pairing weeks (all 32 teams play, landless included),
 * then an 8-team playoff seeded by territory. Playoff losers hand their
 * empire to the winner, so the map consolidates toward the champion.
 */

/** Real NFL stadium coordinates (to ~0.1 degree). Shared-market pairs are
 *  nudged apart slightly so states-level Voronoi still gives both a home:
 *  LAC leans toward its San Diego heritage, NYG toward inland Jersey. */
export const STADIUM_COORDS: Record<string, { lat: number; lon: number }> = {
  KC: { lat: 39.05, lon: -94.48 },
  BUF: { lat: 42.77, lon: -78.79 },
  PHI: { lat: 39.9, lon: -75.17 },
  BAL: { lat: 39.28, lon: -76.62 },
  CIN: { lat: 39.1, lon: -84.52 },
  CLE: { lat: 41.51, lon: -81.7 },
  PIT: { lat: 40.45, lon: -80.02 },
  HOU: { lat: 29.68, lon: -95.41 },
  IND: { lat: 39.76, lon: -86.16 },
  JAX: { lat: 30.32, lon: -81.64 },
  TEN: { lat: 36.17, lon: -86.77 },
  DEN: { lat: 39.74, lon: -105.02 },
  LV: { lat: 36.09, lon: -115.18 },
  LAC: { lat: 33.2, lon: -117.4 },
  LAR: { lat: 33.95, lon: -118.34 },
  NE: { lat: 42.09, lon: -71.26 },
  NYJ: { lat: 40.81, lon: -74.07 },
  NYG: { lat: 40.6, lon: -74.6 },
  MIA: { lat: 25.96, lon: -80.24 },
  DAL: { lat: 32.75, lon: -97.09 },
  WAS: { lat: 38.91, lon: -76.86 },
  CHI: { lat: 41.86, lon: -87.62 },
  DET: { lat: 42.34, lon: -83.05 },
  GB: { lat: 44.5, lon: -88.06 },
  MIN: { lat: 44.97, lon: -93.26 },
  ATL: { lat: 33.75, lon: -84.4 },
  CAR: { lat: 35.23, lon: -80.85 },
  NO: { lat: 29.95, lon: -90.08 },
  TB: { lat: 27.98, lon: -82.5 },
  ARI: { lat: 33.53, lon: -112.26 },
  SEA: { lat: 47.6, lon: -122.33 },
  SF: { lat: 37.4, lon: -121.97 },
};

export const REGULAR_WEEKS = 18;

function dist2(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = aLat - bLat;
  const dLon = (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  return dLat * dLat + dLon * dLon;
}

/** Voronoi seeding: every renderable territory to its nearest stadium, with
 *  every team guaranteed its own home region so nobody spawns landless. */
export function seedEmpires(): Record<string, string> {
  const out: Record<string, string> = {};
  const stateIds = Object.keys(STATE_GEO_COORDS).filter(id => id in TERRITORY_ADJACENCY);
  for (const sid of stateIds) {
    const c = STATE_GEO_COORDS[sid];
    let best = NFL_TEAMS[0].id;
    let bd = Infinity;
    for (const t of NFL_TEAMS) {
      const s = STADIUM_COORDS[t.id];
      if (!s) continue;
      const d = dist2(c.lat, c.lon, s.lat, s.lon);
      if (d < bd) { bd = d; best = t.id; }
    }
    out[sid] = best;
  }
  for (const [sid, team] of Object.entries(INITIAL_TERRITORIES)) {
    if (sid in TERRITORY_ADJACENCY) out[sid] = team;
  }
  return out;
}

export interface ImpGame {
  home: string;
  away: string;
  winner: string;
  homeScore: number;
  awayScore: number;
  /** States that changed hands (the loser's whole empire at kickoff). */
  swing: number;
  /** The loser was landless and just lost again (nothing moved). */
  nothingAtStake: boolean;
  /** A landless team just took an empire. */
  comeback: boolean;
  overtime: boolean;
}

export interface ImpWeekResult {
  week: number;
  label: string;
  games: ImpGame[];
  headlines: string[];
}

export function statesOf(owners: Record<string, string>, teamId: string): string[] {
  return Object.keys(owners).filter(sid => owners[sid] === teamId);
}

export function empireCounts(owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of NFL_TEAMS) m.set(t.id, 0);
  for (const sid of Object.keys(owners)) {
    m.set(owners[sid], (m.get(owners[sid]) ?? 0) + 1);
  }
  return m;
}

export function landlessTeams(owners: Record<string, string>): string[] {
  const counts = empireCounts(owners);
  return NFL_TEAMS.filter(t => (counts.get(t.id) ?? 0) === 0).map(t => t.id);
}

function overallOf(teamId: string): number {
  return TEAM_MAP.get(teamId)?.overall ?? 75;
}

export function teamLabel(teamId: string): string {
  const t = TEAM_MAP.get(teamId);
  return t ? `${t.city} ${t.name}` : teamId;
}

/** Win probability for the home side: overall-gap logistic plus a small
 *  home edge. A 10-point overall gap is roughly 70/30. */
export function homeWinProb(home: string, away: string, ctx?: MomentumCtx): number {
  const gap = overallOf(home) - overallOf(away) + 2;
  const base = 1 / (1 + Math.pow(10, -gap / 22));
  return applyMomentum(base, ctx);
}

function nflScorePair(rng: () => number): [number, number] {
  const winner = 17 + Math.floor(rng() * 25); // 17-41
  const margin = 1 + Math.floor(rng() * 24);  // 1-24
  return [winner, Math.max(0, winner - margin)];
}

export function resolveGame(
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
  records?: Record<string, { streak: number }>,
): ImpGame {
  // Round 91: the map now fights back. Momentum, overextension, last
  // stands and form all tilt the number before the dice are rolled.
  const ctx: MomentumCtx = {
    homeLand: statesOf(owners, home).length,
    awayLand: statesOf(owners, away).length,
    totalLand: Object.keys(owners).length,
    homeStreak: records?.[home]?.streak ?? 0,
    awayStreak: records?.[away]?.streak ?? 0,
  };
  const pHome = homeWinProb(home, away, ctx);
  const roll = rng();
  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  const overtime = Math.abs(roll - pHome) < 0.045; // photo-finish games go to OT
  let [w, l] = nflScorePair(rng);
  if (overtime) { l = w - 3; }
  const homeScore = winner === home ? w : l;
  const awayScore = winner === home ? l : w;

  const loserStates = statesOf(owners, loser);
  const winnerHadNothing = statesOf(owners, winner).length === 0;
  for (const sid of loserStates) owners[sid] = winner;

  return {
    home, away, winner, homeScore, awayScore,
    swing: loserStates.length,
    nothingAtStake: loserStates.length === 0,
    comeback: winnerHadNothing && loserStates.length > 0,
    overtime,
  };
}

export function randomPairings(teamIds: string[], rng: () => number = Math.random): [string, string][] {
  const pool = [...teamIds];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

// ---------------------------------------------------------------------------
// Season records (2026-08-05 realism pass). Wins and losses run alongside the
// territory war: they feed the standings table, the matchup cards, streak
// headlines, and the playoff seeding tiebreak.
// ---------------------------------------------------------------------------

export interface ImpRecord { w: number; l: number; streak: number }
export type ImpRecords = Record<string, ImpRecord>;

export function emptyRecords(teamIds: string[]): ImpRecords {
  const out: ImpRecords = {};
  for (const id of teamIds) out[id] = { w: 0, l: 0, streak: 0 };
  return out;
}

/** Pure: returns a NEW records object with the week's results applied. */
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

export function buildHeadlines(games: ImpGame[], owners: Record<string, string>, records?: ImpRecords): string[] {
  const out: string[] = [];
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${teamLabel(g.winner)} were wiped off the map, won anyway, and just seized ${g.swing} state${g.swing === 1 ? '' : 's'}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 5).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${teamLabel(g.winner)} erase ${teamLabel(loser)}, annexing ${g.swing} states in one afternoon.`);
  }
  const counts = empireCounts(owners);
  let leader = NFL_TEAMS[0].id;
  let max = -1;
  for (const [t, n] of counts) if (n > max) { max = n; leader = t; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${teamLabel(leader)} now hold ${max} of ${total} territories. The map is turning one color.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${teamLabel(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${teamLabel(cold[0])} have dropped ${-cold[1].streak} in a row.`);
  }
  if (out.length === 0) out.push('🧊 A quiet week: no empires changed hands in a big way.');
  return out;
}

/** Top-8 playoff seeding by territory, ties broken by record then overall. */
export function playoffSeeds(owners: Record<string, string>, records?: ImpRecords): string[] {
  const counts = empireCounts(owners);
  const winsOf = (id: string) => records?.[id]?.w ?? 0;
  return NFL_TEAMS
    .map(t => t.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (winsOf(b) - winsOf(a)) ||
      (overallOf(b) - overallOf(a)))
    .slice(0, 8);
}

export const PLAYOFF_LABELS = ['Quarterfinals', 'Semifinals', 'Imperial Championship'];

/** One-conquest end check: somebody owns the entire map. */
export function totalConquest(owners: Record<string, string>): string | null {
  const ids = Object.keys(owners);
  const first = owners[ids[0]];
  return ids.every(sid => owners[sid] === first) ? first : null;
}

export function finalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = statesOf(owners, favorite).length;
  return mine * 3 + predictionHits * 25 + (champion === favorite ? 200 : 0) + (madePlayoffs ? 50 : 0);
}
