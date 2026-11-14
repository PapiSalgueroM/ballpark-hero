import { keyedRng } from './keyedRng';
import { fifaRankOf, nationStrength, simInternationalMatch, type IntlTableRow } from './soccerInternational';

// The 2026/27 draw is cross-checked against the published competition tables.
// https://www.uefa.com/uefanationsleague/news/02a2-1fe8e0405d9d-cc8f1ee7068b-1000--draw-for-the-league-phase-of-the-2026-27-uefa-nations-league/
// https://www.skysports.com/football/competitions/uefa-nations-league/table
// Country labels match the existing Soccer Career nationality keys.
export const NATIONS_LEAGUE_2026_GROUPS = {
  A1: ['France', 'Italy', 'Belgium', 'Turkey'],
  A2: ['Germany', 'Netherlands', 'Serbia', 'Greece'],
  A3: ['Spain', 'Croatia', 'England', 'Czech Republic'],
  A4: ['Portugal', 'Denmark', 'Norway', 'Wales'],
  B1: ['Scotland', 'Switzerland', 'Slovenia', 'North Macedonia'],
  B2: ['Hungary', 'Ukraine', 'Georgia', 'Northern Ireland'],
  B3: ['Israel', 'Austria', 'Ireland', 'Kosovo'],
  B4: ['Poland', 'Bosnia & Herzegovina', 'Romania', 'Sweden'],
  C1: ['Albania', 'Finland', 'Belarus', 'San Marino'],
  C2: ['Montenegro', 'Armenia', 'Cyprus', 'Latvia'],
  C3: ['Kazakhstan', 'Slovakia', 'Faroe Islands', 'Moldova'],
  C4: ['Iceland', 'Bulgaria', 'Estonia', 'Luxembourg'],
  D1: ['Gibraltar', 'Malta', 'Andorra'],
  D2: ['Lithuania', 'Azerbaijan', 'Liechtenstein'],
} as const;

type Group = keyof typeof NATIONS_LEAGUE_2026_GROUPS;
type League = 'A' | 'B' | 'C' | 'D';
type RankedLeagues = Record<League, readonly string[]>;
type PlayOff = { home: string; away: string; winner: string };
type GroupMatch = { group: Group; home: string; away: string; homeGoals: number; awayGoals: number };
type GroupRow = IntlTableRow & { awayGoals: number; awayWins: number };
const GROUP_KEYS = Object.keys(NATIONS_LEAGUE_2026_GROUPS) as Group[];

/** Complete pairing set for the simulation. The group draw gives the venues; the simulated season assigns dates. */
export function nationsLeague2026Fixtures() {
  const fixtures: { group: Group; home: string; away: string }[] = [];
  for (const group of GROUP_KEYS) {
    const nations: readonly string[] = NATIONS_LEAGUE_2026_GROUPS[group];
    for (const home of nations) {
      for (const away of nations) {
        if (home !== away) fixtures.push({ group, home, away });
      }
    }
  }
  return fixtures;
}

function tableFor(nations: readonly string[], matches: readonly GroupMatch[]) {
  const rows = new Map(nations.map(nation => [nation, {
    nation, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, awayGoals: 0, awayWins: 0,
  }]));
  for (const { home, away, homeGoals, awayGoals } of matches) {
    const h = rows.get(home);
    const a = rows.get(away);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.gf += homeGoals;
    h.ga += awayGoals;
    a.gf += awayGoals;
    a.ga += homeGoals;
    a.awayGoals += awayGoals;
    if (homeGoals > awayGoals) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (awayGoals > homeGoals) {
      a.won++;
      a.awayWins++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  return rows;
}

const goalDifference = (a: GroupRow, b: GroupRow) => (b.gf - b.ga) - (a.gf - a.ga);
const miniOrder = (a: GroupRow, b: GroupRow) => b.points - a.points || goalDifference(a, b) || b.gf - a.gf;
const groupFallback = (a: GroupRow, b: GroupRow) => goalDifference(a, b) || b.gf - a.gf
  || b.awayGoals - a.awayGoals || b.won - a.won || b.awayWins - a.awayWins
  || fifaRankOf(a.nation) - fifaRankOf(b.nation) || a.nation.localeCompare(b.nation);

// UEFA article 15 reapplies the head-to-head criteria to any smaller tied subset.
// The simulation does not track discipline; its final fallback uses the existing nation rank.
// https://documents.uefa.com/r/Regulations-of-the-UEFA-Nations-League-2026/27/Article-15-Equality-of-points-league-phase-Online
function orderTied(rows: GroupRow[], matches: readonly GroupMatch[]): GroupRow[] {
  if (rows.length < 2) return rows;
  const mini = tableFor(rows.map(row => row.nation), matches);
  const compare = (a: GroupRow, b: GroupRow) => miniOrder(mini.get(a.nation)!, mini.get(b.nation)!);
  const sorted = [...rows].sort(compare);
  const bands: GroupRow[][] = [];
  for (const row of sorted) {
    const last = bands.at(-1);
    if (last && compare(row, last[0]) === 0) last.push(row);
    else bands.push([row]);
  }
  return bands.length === 1 ? sorted.sort(groupFallback) : bands.flatMap(band => orderTied(band, matches));
}

export function nationsLeague2026GroupTables(matches: readonly GroupMatch[]) {
  return Object.fromEntries(GROUP_KEYS.map(group => {
    const games = matches.filter(match => match.group === group);
    const rows = [...tableFor(NATIONS_LEAGUE_2026_GROUPS[group], games).values()].sort((a, b) => b.points - a.points);
    const byPoints = new Map<number, GroupRow[]>();
    for (const row of rows) {
      const level = byPoints.get(row.points);
      if (level) level.push(row);
      else byPoints.set(row.points, [row]);
    }
    return [group, [...byPoints.values()].flatMap(level => orderTied(level, games))];
  })) as Record<Group, GroupRow[]>;
}

export function simulateNationsLeague2026Groups(seed: string) {
  const matches = nationsLeague2026Fixtures().map(fixture => {
    const random = keyedRng(`nations-league|2026|${seed}|${fixture.home}|${fixture.away}`);
    const { a, b } = simInternationalMatch(nationStrength(fixture.home), nationStrength(fixture.away), false, 0, 0, random);
    return { ...fixture, homeGoals: a, awayGoals: b };
  });
  return { matches, tables: nationsLeague2026GroupTables(matches) };
}

/** Article 19 of the September 2026 regulations governs the move from four to three leagues.
 *  https://documents.uefa.com/r/Regulations-of-the-UEFA-Nations-League-2026/27/Article-19-Individual-league-interim-overall-and-final-overall-rankings-Online
 *  https://www.figc.it/en/figc/news/nations-league-2026-27-set-for-changes-the-two-best-third-placed-teams-remain-in-league-a-with-only-the-two-worst-fourth-placed-sides-relegated-automatically-nd7l449n
 */
export function nationsLeague2026NextLeagues({ A, B, C, D }: RankedLeagues, ab: readonly PlayOff[], bc: readonly PlayOff[]) {
  const resolve = (higher: readonly string[], lower: readonly string[], ties: readonly PlayOff[]) => {
    if (ties.length !== higher.length || higher.length !== lower.length) return null;
    const seen = new Set<string>();
    for (const { home, away, winner } of ties) {
      const pairingFits = higher.includes(home) && lower.includes(away) || higher.includes(away) && lower.includes(home);
      if (!pairingFits || seen.has(home) || seen.has(away) || (winner !== home && winner !== away)) return null;
      seen.add(home);
      seen.add(away);
    }
    return {
      winners: ties.map(tie => tie.winner),
      losers: ties.map(tie => tie.winner === tie.home ? tie.away : tie.home),
    };
  };
  const rankings = { A, B, C, D };
  for (const league of ['A', 'B', 'C', 'D'] as const) {
    const teams: readonly string[] = Object.entries(NATIONS_LEAGUE_2026_GROUPS)
      .filter(([group]) => group.startsWith(league)).flatMap(([, group]) => [...group]);
    const ranking = rankings[league];
    if (ranking.length !== teams.length || new Set(ranking).size !== teams.length
      || ranking.some(nation => !teams.includes(nation))) return null;
  }
  const abResult = resolve(A.slice(10, 14), B.slice(4, 8), ab);
  const bcResult = resolve(B.slice(12), C.slice(4, 8), bc);
  if (!abResult || !bcResult) return null;
  return {
    A: [...A.slice(0, 10), ...B.slice(0, 4), ...abResult.winners],
    B: [...A.slice(14), ...abResult.losers, ...B.slice(8, 12), ...C.slice(0, 4), ...bcResult.winners],
    C: [...bcResult.losers, ...C.slice(8), ...D],
  };
}
