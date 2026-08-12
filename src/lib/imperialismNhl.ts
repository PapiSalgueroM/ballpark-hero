import { NHL_TEAMS, NHL_TEAM_MAP, INITIAL_TERRITORIES_NHL } from '@/data/conquestDataNhl';

/**
 * NHL Imperialism engine (2026-08-05, every-sport push). Same canonical
 * rules as src/lib/imperialism.ts: winners annex the loser's entire empire,
 * landless teams keep playing and can take it all back, overtime means no
 * ties. Kept as its own module so no sport can regress another.
 *
 * NHL twists: 16 random-pairing rounds (32 teams), hockey scorelines
 * (winner 2-7, one-goal OT finishes), and THE INVADERS: five clubs with no
 * legitimate nearest-arena US territory (Toronto, Ottawa, Edmonton,
 * Vancouver, Buffalo) start landless by design; one win hands them an
 * entire empire.
 */

export const NHL_REGULAR_ROUNDS = 16;
export const NHL_PLAYOFF_LABELS = ['Quarterfinals', 'Semifinals', 'Imperial Cup Final'];

export function seedNhlEmpires(): Record<string, string> {
  return { ...INITIAL_TERRITORIES_NHL };
}

export interface NhlImpGame {
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

export interface NhlImpRoundResult {
  round: number;
  label: string;
  games: NhlImpGame[];
  headlines: string[];
}

export function nhlStatesOf(owners: Record<string, string>, teamId: string): string[] {
  return Object.keys(owners).filter(sid => owners[sid] === teamId);
}

export function nhlEmpireCounts(owners: Record<string, string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of NHL_TEAMS) m.set(t.id, 0);
  for (const sid of Object.keys(owners)) {
    m.set(owners[sid], (m.get(owners[sid]) ?? 0) + 1);
  }
  return m;
}

export function nhlLandlessTeams(owners: Record<string, string>): string[] {
  const counts = nhlEmpireCounts(owners);
  return NHL_TEAMS.filter(t => (counts.get(t.id) ?? 0) === 0).map(t => t.id);
}

function overallOf(teamId: string): number {
  return NHL_TEAM_MAP.get(teamId)?.overall ?? 75;
}

export function nhlTeamLabel(teamId: string): string {
  const t = NHL_TEAM_MAP.get(teamId);
  return t ? `${t.city} ${t.name}` : teamId;
}

/** Home win probability: overall-gap logistic plus home ice. */
export function nhlHomeWinProb(home: string, away: string): number {
  const gap = overallOf(home) - overallOf(away) + 2;
  return 1 / (1 + Math.pow(10, -gap / 22));
}

function nhlScorePair(rng: () => number): [number, number] {
  const winner = 2 + Math.floor(rng() * 6); // 2-7
  const margin = 1 + Math.floor(rng() * Math.min(4, winner)); // 1-4, capped by winner
  return [winner, Math.max(0, winner - margin)];
}

export function resolveNhlGame(
  home: string,
  away: string,
  owners: Record<string, string>,
  rng: () => number = Math.random,
): NhlImpGame {
  const pHome = nhlHomeWinProb(home, away);
  const roll = rng();
  const winner = roll < pHome ? home : away;
  const loser = winner === home ? away : home;
  const overtime = Math.abs(roll - pHome) < 0.055;
  let [w, l] = nhlScorePair(rng);
  if (overtime) { l = w - 1; } // sudden death: one-goal game by definition
  const homeScore = winner === home ? w : l;
  const awayScore = winner === home ? l : w;

  const loserStates = nhlStatesOf(owners, loser);
  const winnerHadNothing = nhlStatesOf(owners, winner).length === 0;
  for (const sid of loserStates) owners[sid] = winner;

  return {
    home, away, winner, homeScore, awayScore,
    swing: loserStates.length,
    nothingAtStake: loserStates.length === 0,
    comeback: winnerHadNothing && loserStates.length > 0,
    overtime,
  };
}

export function nhlRandomPairings(rng: () => number = Math.random): [string, string][] {
  const pool = NHL_TEAMS.map(t => t.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
  return pairs;
}

export interface NhlImpRecord { w: number; l: number; streak: number }
export type NhlImpRecords = Record<string, NhlImpRecord>;

export function nhlEmptyRecords(): NhlImpRecords {
  const out: NhlImpRecords = {};
  for (const t of NHL_TEAMS) out[t.id] = { w: 0, l: 0, streak: 0 };
  return out;
}

/** Pure: returns a NEW records object with the round's results applied. */
export function nhlApplyRecords(records: NhlImpRecords, games: NhlImpGame[]): NhlImpRecords {
  const next: NhlImpRecords = {};
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

export function nhlRecordLabel(r?: NhlImpRecord): string {
  return r ? `${r.w}-${r.l}` : '0-0';
}

export function nhlBuildHeadlines(games: NhlImpGame[], owners: Record<string, string>, records?: NhlImpRecords): string[] {
  const out: string[] = [];
  const comebacks = games.filter(g => g.comeback).sort((a, b) => b.swing - a.swing);
  for (const g of comebacks.slice(0, 2)) {
    out.push(`🔥 ${nhlTeamLabel(g.winner)} had no land at the anthem and just seized ${g.swing} territor${g.swing === 1 ? 'y' : 'ies'}!`);
  }
  const big = games.filter(g => !g.comeback && g.swing >= 5).sort((a, b) => b.swing - a.swing);
  for (const g of big.slice(0, 2)) {
    const loser = g.winner === g.home ? g.away : g.home;
    out.push(`💥 ${nhlTeamLabel(g.winner)} erase ${nhlTeamLabel(loser)}, annexing ${g.swing} territories in one night.`);
  }
  const counts = nhlEmpireCounts(owners);
  let leader = NHL_TEAMS[0].id;
  let max = -1;
  for (const [t, n] of counts) if (n > max) { max = n; leader = t; }
  const total = Object.keys(owners).length;
  if (max >= total * 0.5) out.push(`👑 ${nhlTeamLabel(leader)} now hold ${max} of ${total} territories. The map is turning one color.`);
  if (records) {
    const hot = Object.entries(records).sort((a, b) => b[1].streak - a[1].streak)[0];
    if (hot && hot[1].streak >= 4) out.push(`📈 ${nhlTeamLabel(hot[0])} have won ${hot[1].streak} straight.`);
    const cold = Object.entries(records).sort((a, b) => a[1].streak - b[1].streak)[0];
    if (cold && cold[1].streak <= -4) out.push(`📉 ${nhlTeamLabel(cold[0])} have dropped ${-cold[1].streak} in a row.`);
  }
  if (out.length === 0) out.push('🧊 A quiet night around the league: no empires moved in a big way.');
  return out;
}

export function nhlPlayoffSeeds(owners: Record<string, string>, records?: NhlImpRecords): string[] {
  const counts = nhlEmpireCounts(owners);
  const winsOf = (id: string) => records?.[id]?.w ?? 0;
  return NHL_TEAMS
    .map(t => t.id)
    .sort((a, b) =>
      (counts.get(b)! - counts.get(a)!) ||
      (winsOf(b) - winsOf(a)) ||
      (overallOf(b) - overallOf(a)))
    .slice(0, 8);
}

export function nhlTotalConquest(owners: Record<string, string>): string | null {
  const ids = Object.keys(owners);
  const first = owners[ids[0]];
  return ids.every(sid => owners[sid] === first) ? first : null;
}

export function nhlFinalScore(
  favorite: string,
  owners: Record<string, string>,
  predictionHits: number,
  champion: string | null,
  madePlayoffs: boolean,
): number {
  const mine = nhlStatesOf(owners, favorite).length;
  return mine * 3 + predictionHits * 25 + (champion === favorite ? 200 : 0) + (madePlayoffs ? 50 : 0);
}
