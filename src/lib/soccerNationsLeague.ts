import { keyedRng } from './keyedRng';
import { shuffled } from './keyedShuffle';
import { internationalShootout, nationStrength, simInternationalMatch, type IntlTableRow } from './soccerInternational';

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

// Annex C access list, with the March playoff results resolved in the September regulations.
// https://documents.uefa.com/r/Regulations-of-the-UEFA-Nations-League-2026/27/Annex-C-2026/27-Final-UEFA-Nations-League-Access-List-and-Overall-Rankings-Online
const ACCESS_ORDER = new Map([
  'Portugal', 'Spain', 'France', 'Germany', 'Italy', 'Netherlands', 'Denmark', 'Croatia',
  'Serbia', 'Belgium', 'England', 'Norway', 'Wales', 'Czech Republic', 'Greece', 'Turkey',
  'Scotland', 'Hungary', 'Poland', 'Israel', 'Switzerland', 'Bosnia & Herzegovina', 'Austria', 'Ukraine',
  'Slovenia', 'Georgia', 'Ireland', 'Romania', 'Sweden', 'North Macedonia', 'Northern Ireland', 'Kosovo',
  'Iceland', 'Albania', 'Montenegro', 'Kazakhstan', 'Finland', 'Slovakia', 'Bulgaria', 'Armenia',
  'Belarus', 'Faroe Islands', 'Cyprus', 'Estonia', 'Latvia', 'Luxembourg', 'Moldova', 'San Marino',
  'Azerbaijan', 'Lithuania', 'Gibraltar', 'Malta', 'Liechtenstein', 'Andorra',
].map((nation, index) => [nation, index]));

/** Each drawn group plays home and away within its league phase. */
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
  || ACCESS_ORDER.get(a.nation)! - ACCESS_ORDER.get(b.nation)!;

// UEFA article 15 reapplies the head-to-head criteria to any smaller tied subset.
// After scored match criteria, the simulation uses the official access list. It omits disciplinary points.
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
  return leagueTables(NATIONS_LEAGUE_2026_GROUPS, matches);
}

function leagueTables<G extends Group>(groups: Record<G, readonly string[]>, matches: readonly GroupMatch[]) {
  return Object.fromEntries((Object.keys(groups) as G[]).map(group => {
    const games = matches.filter(match => match.group === group);
    const rows = [...tableFor(groups[group], games).values()].sort((a, b) => b.points - a.points);
    const byPoints = new Map<number, GroupRow[]>();
    for (const row of rows) {
      const level = byPoints.get(row.points);
      if (level) level.push(row);
      else byPoints.set(row.points, [row]);
    }
    return [group, [...byPoints.values()].flatMap(level => orderTied(level, games))];
  })) as Record<G, GroupRow[]>;
}

export function simulateNationsLeague2026Groups(seed: string) {
  const matches = nationsLeague2026Fixtures().map(fixture => {
    const random = keyedRng(`nations-league|2026|${seed}|${fixture.home}|${fixture.away}`);
    return { ...fixture, ...matchScore(fixture.home, fixture.away, random, false) };
  });
  return { matches, tables: nationsLeague2026GroupTables(matches) };
}

type Goals = { homeGoals: number; awayGoals: number };
type KnockoutMatch = Goals & { home: string; away: string; extraTime?: Goals; penalties?: string };
type TwoLegTie = PlayOff & { legs: [KnockoutMatch, KnockoutMatch] };
type SingleLegTie = KnockoutMatch & { winner: string };

function matchScore(home: string, away: string, random: () => number, neutral: boolean, minutes = 90): Goals {
  const { a, b } = simInternationalMatch(nationStrength(home), nationStrength(away), false,
    neutral ? 0 : 0.20, neutral ? 0 : -0.08, random, minutes);
  return { homeGoals: a, awayGoals: b };
}

// Article 18 settles ties on the combined score. Third place skips extra time.
// https://documents.uefa.com/r/Regulations-of-the-UEFA-Nations-League-2026/27/Article-18-Extra-time-and-penalty-shoot-outs-Online
function settleMatch(match: KnockoutMatch, firstLegMargin: number, random: () => number, neutral: boolean, extraTime = true) {
  let margin = firstLegMargin + match.homeGoals - match.awayGoals;
  if (margin === 0 && extraTime) {
    match.extraTime = matchScore(match.home, match.away, random, neutral, 30);
    margin = match.extraTime.homeGoals - match.extraTime.awayGoals;
  }
  if (margin !== 0) return margin > 0 ? match.home : match.away;
  match.penalties = internationalShootout(nationStrength(match.home), nationStrength(match.away), random) ? match.home : match.away;
  return match.penalties;
}

function twoLegs(home: string, away: string, random: () => number): TwoLegTie {
  const first = { home, away, ...matchScore(home, away, random, false) };
  const second = { home: away, away: home, ...matchScore(away, home, random, false) };
  const winner = settleMatch(second, first.awayGoals - first.homeGoals, random, false);
  return { home, away, winner, legs: [first, second] };
}

function singleLeg(home: string, away: string, random: () => number, extraTime = true): SingleLegTie {
  const match = { home, away, ...matchScore(home, away, random, true) };
  const winner = settleMatch(match, 0, random, true, extraTime);
  return { ...match, winner };
}

function rankLeague(tables: GroupRow[][]): string[] {
  return Array.from({ length: tables[0].length }, (_, place) => tables.map(rows => rows[place])
    .sort((a, b) => b.points - a.points || groupFallback(a, b)).map(row => row.nation)).flat();
}

const loser = (match: PlayOff) => match.winner === match.home ? match.away : match.home;

function quarterfinalDraw(winners: readonly string[], runnersUp: string[], tables: Partial<Record<Group, GroupRow[]>>, random: () => number) {
  const groupOf = new Map(Object.entries(tables).flatMap(([group, rows]) => rows.map(row => [row.nation, group] as const)));
  const draw = (teams: string[], chosen: string[]): string[] | undefined => {
    if (!teams.length) return chosen;
    for (const nation of shuffled(teams, random)) {
      if (groupOf.get(nation) === groupOf.get(winners[chosen.length])) continue;
      const rest = draw(teams.filter(other => other !== nation), [...chosen, nation]);
      if (rest) return rest;
    }
  };
  return draw(runnersUp, [])!.map((runner, i) => twoLegs(runner, winners[i], random));
}

function finalFourFrom(quarterfinals: readonly TwoLegTie[], random: () => number) {
  const [one, two, three, four] = shuffled(quarterfinals.map(tie => tie.winner), random);
  const semifinals = [singleLeg(one, two, random), singleLeg(three, four, random)];
  const final = singleLeg(semifinals[0].winner, semifinals[1].winner, random);
  const thirdPlace = singleLeg(loser(semifinals[0]), loser(semifinals[1]), random, false);
  return { semifinals, final, thirdPlace };
}

function leaguePlayoffs(higher: readonly string[], lower: readonly string[], random: () => number) {
  return shuffled(lower, random).map((nation, i) => twoLegs(nation, higher[i], random));
}

// Articles 16 and 17 give the higher seed the second leg at home.
export function simulateNationsLeague2026(seed: string) {
  const { matches, tables } = simulateNationsLeague2026Groups(seed);
  const rankings: RankedLeagues = {
    A: rankLeague([tables.A1, tables.A2, tables.A3, tables.A4]),
    B: rankLeague([tables.B1, tables.B2, tables.B3, tables.B4]),
    C: rankLeague([tables.C1, tables.C2, tables.C3, tables.C4]),
    D: rankLeague([tables.D1, tables.D2]),
  };
  const random = keyedRng(`nations-league|2026|${seed}|knockout`);
  const quarterfinals = quarterfinalDraw(rankings.A.slice(0, 4), rankings.A.slice(4, 8), tables, random);
  const ab = leaguePlayoffs(rankings.A.slice(10, 14), rankings.B.slice(4, 8), random);
  const bc = leaguePlayoffs(rankings.B.slice(12), rankings.C.slice(4, 8), random);
  const finals = finalFourFrom(quarterfinals, random);
  const { final, thirdPlace } = finals;

  const leagues = nationsLeague2026NextLeagues(rankings, ab, bc)!;
  const interimOrder = [...rankings.A, ...rankings.B, ...rankings.C, ...rankings.D];
  const interim = (nation: string) => interimOrder.indexOf(nation);
  const finalFour = [final.winner, loser(final), thirdPlace.winner, loser(thirdPlace)];
  const nextLeagues = {
    A: [...finalFour, ...leagues.A.filter(nation => !finalFour.includes(nation)).sort((a, b) => interim(a) - interim(b))],
    B: [...leagues.B.slice(0, 6).sort((a, b) => interim(a) - interim(b)), ...leagues.B.slice(6, 10),
      ...leagues.B.slice(10).sort((a, b) => interim(a) - interim(b))],
    C: [...leagues.C.slice(0, 4).sort((a, b) => interim(a) - interim(b)), ...leagues.C.slice(4)],
  };
  return { matches, tables, rankings, quarterfinals, ab, bc, ...finals, nextLeagues };
}

type FutureLeague = Exclude<League, 'D'>;
type FutureGroup = `${FutureLeague}${1 | 2 | 3}`;
type FutureLeagues = Record<FutureLeague, readonly string[]>;

// UEFA's 2028/29 format uses three pots per tier. See slides four and five.
// https://editorial.uefa.com/resources/02a5-20ab6d2f8514-897923904829-1000/ntc_review._compilation_of_slides_for_media.pdf
export function simulateNationsLeague2028(seed: string, year = 2028, previous = simulateNationsLeague2026(seed).nextLeagues as FutureLeagues) {
  const drawRandom = keyedRng(`nations-league|${year}|${seed}|pots`);
  const groups = {} as Record<FutureGroup, string[]>;
  const matches: GroupMatch[] = [];
  for (const league of ['A', 'B', 'C'] as const) {
    const pots = [0, 6, 12].map(start => shuffled(previous[league].slice(start, start + 6), drawRandom));
    for (const number of [1, 2, 3] as const) {
      const group = `${league}${number}` as const;
      const index = (number - 1) * 2;
      const nations = pots.flatMap(pot => pot.slice(index, index + 2));
      groups[group] = nations;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (i === j) continue;
          const samePot = Math.floor(i / 2) === Math.floor(j / 2);
          // Across pots, matching pot slots host in one direction and crossed slots host in the other.
          const hosts = ((i + j) % 2 === 0) === (i < j);
          if (!samePot && !hosts) continue;
          const home = nations[i], away = nations[j];
          const random = keyedRng(`nations-league|${year}|${seed}|${home}|${away}`);
          matches.push({ group, home, away, ...matchScore(home, away, random, false) });
        }
      }
    }
  }
  const tables = leagueTables(groups, matches);
  const rankings = {
    A: rankLeague([tables.A1, tables.A2, tables.A3]),
    B: rankLeague([tables.B1, tables.B2, tables.B3]),
    C: rankLeague([tables.C1, tables.C2, tables.C3]),
  };
  const random = keyedRng(`nations-league|${year}|${seed}|knockout`);
  // Keep different groups apart and host the return leg at the higher seed in the simulated draw.
  const quarterfinals = quarterfinalDraw(rankings.A.slice(0, 4), rankings.A.slice(4, 8), tables, random);
  const ab = leaguePlayoffs(rankings.A.slice(9, 15), rankings.B.slice(3, 9), random);
  const bc = leaguePlayoffs(rankings.B.slice(9, 15), rankings.C.slice(3, 9), random);
  const finals = finalFourFrom(quarterfinals, random);
  const { final, thirdPlace } = finals;
  const finalFour = [final.winner, loser(final), thirdPlace.winner, loser(thirdPlace)];
  const nextLeagues = {
    A: [...finalFour, ...rankings.A.slice(0, 9).filter(nation => !finalFour.includes(nation)), ...ab.map(tie => tie.winner), ...rankings.B.slice(0, 3)],
    B: [...rankings.A.slice(15), ...ab.map(loser), ...bc.map(tie => tie.winner), ...rankings.C.slice(0, 3)],
    C: [...rankings.B.slice(15), ...bc.map(loser), ...rankings.C.slice(9)],
  };
  return { matches, tables, rankings, quarterfinals, ab, bc, ...finals, nextLeagues };
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
