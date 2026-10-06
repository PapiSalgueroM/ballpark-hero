import type { CareerPos, SeasonLine } from '@/lib/nflMyCareer';
import type { NbaSeasonLine } from '@/lib/nbaMyCareer';
import type { MlbCareerPos, MlbSeasonLine } from '@/lib/mlbMyCareer';
import type { NhlCareerPos, NhlSeasonLine } from '@/lib/nhlMyCareer';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

export interface CareerReviewStat { label: string; value: string; numeric?: { raw?: number; digits?: number } }
export interface CareerReviewStats { regular: CareerReviewStat[]; postseason: CareerReviewStat[]; gamesLabel: string; regularValues: CareerReviewStat[] }

const recorded = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
const number = (label: string, value: number | undefined, digits?: number): CareerReviewStat => ({
  label,
  value: recorded(value) ? digits === undefined ? String(value) : value.toFixed(digits) : 'Not recorded',
  numeric: { raw: recorded(value) ? value : undefined, digits },
});
const text = (label: string, value: string | undefined): CareerReviewStat => ({ label, value: typeof value === 'string' && value.trim() ? value : 'Not recorded' });
const stats = (result: string, regular: CareerReviewStat[], postseason: CareerReviewStat[]): CareerReviewStats =>
  result === 'SUSPENDED'
    ? { regular: [text('Season', 'Suspended, no season played')], postseason: [text('Postseason', 'Not played during this suspended season')], gamesLabel: 'Games', regularValues: regular }
    : { regular, postseason, gamesLabel: 'Games', regularValues: regular };

export function nflSeasonReview(s: SeasonLine, pos: CareerPos): CareerReviewStats {
  let regular: CareerReviewStat[];
  switch (pos) {
    case 'QB': regular = [number('Passing yards', s.passYds), number('Passing touchdowns', s.passTd), number('Interceptions thrown', s.ints)]; break;
    case 'RB': regular = [number('Rushing yards', s.rushYds), number('Rushing touchdowns', s.rushTd), number('Receptions', s.rec), number('Receiving yards', s.recYds)]; break;
    case 'WR':
    case 'TE': regular = [number('Receptions', s.rec), number('Receiving yards', s.recYds), number('Receiving touchdowns', s.recTd)]; break;
    case 'LB': regular = [number('Tackles', s.tackles), number('Sacks', s.sacks), number('Interceptions', s.picks)]; break;
    case 'CB': regular = [number('Interceptions', s.picks), number('Passes defended', s.passDef), number('Tackles', s.tackles)]; break;
    case 'EDGE': regular = [number('Sacks', s.sacks), number('Tackles', s.tackles), number('Forced fumbles', s.forcedFum)]; break;
    case 'K': regular = [number('Field goals made', s.fgMade), number('Field goals attempted', s.fgAtt), number('Longest field goal', s.longFg)]; break;
    default: regular = [text('Performance', undefined)];
  }
  return stats(s.teamResult, regular, [number('Games', s.poGames), text('Performance', s.poLine)]);
}

export function nbaSeasonReview(s: NbaSeasonLine): CareerReviewStats {
  return stats(s.teamResult,
    [number('Points per game', s.ppg), number('Rebounds per game', s.rpg), number('Assists per game', s.apg)],
    [number('Games', s.poGames), number('Points per game', s.poPpg), number('Rebounds per game', s.poRpg), number('Assists per game', s.poApg)]);
}

export function mlbSeasonReview(s: MlbSeasonLine, pos: MlbCareerPos): CareerReviewStats {
  const regular = pos === 'SP'
    ? [number('Wins', s.wins), number('Losses', s.lossesP), number('ERA', s.era, 2), number('Strikeouts', s.so)]
    : pos === 'RP'
      ? [number('Saves', s.saves), number('Holds', s.holds), number('ERA', s.era, 2), number('Strikeouts', s.so)]
      : [number('Batting average', s.avg, 3), number('Home runs', s.hr), number('Runs batted in', s.rbi), number('Stolen bases', s.sb), number('On base percentage', s.obp, 3), number('Doubles', s.doubles)];
  return { ...stats(s.teamResult, regular, [number('Team postseason games', s.poGames), text('Performance', s.poLine)]), gamesLabel: pos === 'SP' ? 'Starts' : pos === 'RP' ? 'Appearances' : 'Games' };
}

export function nhlSeasonReview(s: NhlSeasonLine, pos: NhlCareerPos): CareerReviewStats {
  return stats(s.teamResult,
    pos === 'G' ? [number('Wins', s.wins), number('Save percentage', s.svpct, 3)]
      : [number('Goals', s.goals), number('Assists', s.assists), number('Points', s.points)],
    pos === 'G' ? [number('Games', s.poGames), number('Wins', s.poWins), number('Save percentage', s.poSvpct, 3)]
      : [number('Games', s.poGames), number('Goals', s.poGoals), number('Assists', s.poAssists), number('Points', s.poPoints)]);
}

export interface CareerSeasonHigh { label: string; value: string; indices: number[] }

export function seasonHighs(career: UsCareerCore, sport: UsCareerSport): CareerSeasonHigh[] {
  const nflLabels: Record<string, string> = { QB: 'Passing yards', RB: 'Rushing yards', WR: 'Receiving yards', TE: 'Receiving yards', LB: 'Tackles', CB: 'Interceptions', EDGE: 'Sacks', K: 'Field goals made' };
  const positionLabel = sport.slug === 'nba' ? 'Points per game'
    : sport.slug === 'nfl' ? nflLabels[career.pos] ?? 'Performance'
      : sport.slug === 'mlb' ? career.pos === 'SP' ? 'Wins' : career.pos === 'RP' ? 'Saves' : 'Home runs'
        : career.pos === 'G' ? 'Wins' : 'Points';
  const gamesLabel = career.seasons.length ? sport.reviewStats(career.seasons[0], career.pos).gamesLabel : 'Games';
  const seasons = career.seasons.map((season, index) => ({ season, index }))
    .filter(({ season }) => season.teamResult !== 'SUSPENDED');
  const metrics = [
    { label: 'Season OVR', values: seasons.map(({ season, index }) => ({ index, raw: season.ovr, value: String(season.ovr) })) },
    { label: gamesLabel, values: seasons.map(({ season, index }) => ({ index, raw: season.games, value: String(season.games) })) },
    { label: positionLabel, values: seasons.map(({ season, index }) => {
      const stat = sport.reviewStats(season, career.pos).regularValues.find(stat => stat.label === positionLabel);
      return { index, raw: stat?.numeric?.raw, value: stat?.value ?? 'Not recorded' };
    }) },
  ];
  return metrics.map(({ label, values }) => {
    const valid = values.filter(value => recorded(value.raw));
    if (!valid.length) return { label, value: 'Not recorded', indices: [] };
    const highest = Math.max(...valid.map(value => value.raw!));
    const tied = valid.filter(value => value.raw === highest).reverse();
    return { label, value: tied[0].value, indices: tied.map(value => value.index) };
  });
}
