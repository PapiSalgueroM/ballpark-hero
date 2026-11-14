import { keyedRng } from './keyedRng';
import { shuffled } from './keyedShuffle';
import { poissonGoals } from './soccerCareerContinental';

// The final draw includes LAFC after the qualification playoff. Auckland City and Auckland FC are separate clubs.
// https://www.fifa.com/en/tournaments/mens/club-world-cup/usa-2025/articles/teams-dates-venue-groups-draw-matches-tickets
// https://www.skysports.com/football/news/11095/13270883/club-world-cup-2025-fixtures-uk-kick-off-times-chelsea-man-city-schedule-and-final-date
export const CLUB_WORLD_CUP_2025_GROUPS = {
  A: ['Palmeiras', 'Porto', 'Al Ahly', 'Inter Miami'],
  B: ['PSG', 'Atletico Madrid', 'Botafogo', 'Seattle Sounders'],
  C: ['Bayern Munich', 'Auckland City', 'Boca Juniors', 'Benfica'],
  D: ['Flamengo', 'Esperance', 'Chelsea', 'LAFC'],
  E: ['River Plate', 'Urawa Red Diamonds', 'Monterrey', 'Inter Milan'],
  F: ['Fluminense', 'Dortmund', 'Ulsan HD', 'Mamelodi Sundowns'],
  G: ['Man City', 'Wydad Casablanca', 'Al Ain', 'Juventus'],
  H: ['Real Madrid', 'Al Hilal', 'Pachuca', 'Red Bull Salzburg'],
} as const;

type Group = keyof typeof CLUB_WORLD_CUP_2025_GROUPS;
type Stage = 'Group' | 'Round of 16' | 'Quarterfinal' | 'Semifinal' | 'Final';
type Score = { homeGoals: number; awayGoals: number };
type GroupRow = { club: string; played: number; points: number; gf: number; ga: number };
type Match = Score & { home: string; away: string; stage: Stage; group?: Group; extraTime?: Score; penalties?: string; winner?: string };
type DecidedMatch = Match & { winner: string };

function groupTotals(clubs: readonly string[], matches: readonly Match[]) {
  const members = new Set(clubs);
  return new Map(clubs.map(club => {
    const row: GroupRow = { club, played: 0, points: 0, gf: 0, ga: 0 };
    for (const match of matches) {
      const isHome = match.home === club;
      if (!isHome && match.away !== club || !members.has(isHome ? match.away : match.home)) continue;
      const forGoals = isHome ? match.homeGoals : match.awayGoals;
      const against = isHome ? match.awayGoals : match.homeGoals;
      row.played++;
      row.points += forGoals > against ? 3 : forGoals === against ? 1 : 0;
      row.gf += forGoals;
      row.ga += against;
    }
    return [club, row];
  }));
}

const goalsOrder = (a: GroupRow, b: GroupRow) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
const tableOrder = (a: GroupRow, b: GroupRow) => b.points - a.points || goalsOrder(a, b);

function splitTies(rows: GroupRow[], compare: (a: GroupRow, b: GroupRow) => number) {
  const ties: GroupRow[][] = [];
  for (const row of rows.sort(compare)) {
    const last = ties.at(-1);
    if (last && compare(last[0], row) === 0) last.push(row);
    else ties.push([row]);
  }
  return ties;
}

// FIFA uses head-to-head again for any smaller tied subset. Fully level clubs draw lots here.
// https://www.fifa.com/en/articles/group-stage-who-will-qualify-permutations
function rankGroup(clubs: readonly string[], matches: readonly Match[], seed: string) {
  const rankTied = (rows: GroupRow[]): GroupRow[] => {
    if (rows.length < 2) return rows;
    const mini = groupTotals(rows.map(row => row.club), matches);
    const ties = splitTies(rows, (a, b) => tableOrder(mini.get(a.club)!, mini.get(b.club)!));
    if (ties.length > 1) return ties.flatMap(rankTied);
    return shuffled(rows, keyedRng(seed)).sort(goalsOrder);
  };
  return splitTies([...groupTotals(clubs, matches).values()], (a, b) => b.points - a.points).flatMap(rankTied);
}

// Slots 49 to 63 follow the published 2025 bracket.
// https://www.fifa.com/en/tournaments/mens/club-world-cup/usa-2025/articles/knockout-stage-bracket-play-offs-match-schedule
export function simulateClubWorldCup2025(seed: string, tierOf: (club: string) => number) {
  const matches: Match[] = [];
  const play = (home: string, away: string, stage: Stage, group?: Group) => {
    const random = keyedRng(`club-world-cup|2025|${seed}|${stage}|${home}|${away}`);
    const edge = (tierOf(away) - tierOf(home)) * 0.22;
    const score = (length: number) => ({
      homeGoals: poissonGoals(Math.max(0.2, 1.35 + edge) * length, random),
      awayGoals: poissonGoals(Math.max(0.2, 1.35 - edge) * length, random),
    });
    const match: Match = { home, away, stage, ...score(1) };
    if (group) match.group = group;
    if (stage !== 'Group') {
      let margin = match.homeGoals - match.awayGoals;
      if (margin === 0) {
        match.extraTime = score(1 / 3);
        margin = match.extraTime.homeGoals - match.extraTime.awayGoals;
      }
      if (margin === 0) match.penalties = random() < 0.5 ? home : away;
      match.winner = match.penalties ?? (margin > 0 ? home : away);
    }
    matches.push(match);
    return match;
  };
  const tables = {} as Record<Group, GroupRow[]>;
  for (const group of Object.keys(CLUB_WORLD_CUP_2025_GROUPS) as Group[]) {
    const clubs: readonly string[] = CLUB_WORLD_CUP_2025_GROUPS[group];
    const fixtures = clubs.flatMap((home, i) => clubs.slice(i + 1).map(away => play(home, away, 'Group', group)));
    tables[group] = rankGroup(clubs, fixtures, `club-world-cup|2025|${seed}|${group}|lots`);
  }
  const draw: [Group, Group][] = [['A', 'B'], ['C', 'D'], ['B', 'A'], ['D', 'C'], ['E', 'F'], ['G', 'H'], ['H', 'G'], ['F', 'E']];
  const winners = (pairs: [number, number][], preceding: DecidedMatch[], stage: Stage) => pairs.map(([a, b]) => (
    play(preceding[a].winner, preceding[b].winner, stage) as DecidedMatch
  ));
  const round16 = draw.map(([a, b]) => play(tables[a][0].club, tables[b][1].club, 'Round of 16') as DecidedMatch);
  const quarterfinals = winners([[4, 5], [0, 1], [2, 3], [6, 7]], round16, 'Quarterfinal');
  const semifinals = winners([[0, 1], [2, 3]], quarterfinals, 'Semifinal');
  const [final] = winners([[0, 1]], semifinals, 'Final');
  return { tables, matches, champion: final.winner };
}
