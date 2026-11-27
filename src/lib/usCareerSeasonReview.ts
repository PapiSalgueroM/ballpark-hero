import type { CareerPos, SeasonLine } from '@/lib/nflMyCareer';
import type { NbaSeasonLine } from '@/lib/nbaMyCareer';
import type { MlbCareerPos, MlbSeasonLine } from '@/lib/mlbMyCareer';
import type { NhlCareerPos, NhlSeasonLine } from '@/lib/nhlMyCareer';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';
import { formatNumber } from '@/lib/formatNumber';
import { earnedDrawTrust } from '@/lib/nhlDefensiveDraws';
import { NHL_SHOOTOUT_STANCES } from '@/lib/nhlShootout';
import { CHANGEUP_REPS } from '@/lib/mlbChangeup';

export interface CareerReviewStat { label: string; value: string; numeric?: { raw?: number; digits?: number } }
export interface CareerReviewStats { regular: CareerReviewStat[]; postseason: CareerReviewStat[]; gamesLabel: string; regularValues: CareerReviewStat[] }

const recorded = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
const number = (label: string, value: number | undefined, digits?: number): CareerReviewStat => ({
  label,
  value: recorded(value) ? formatNumber(digits === undefined ? value : value.toFixed(digits)) : 'Not recorded',
  numeric: { raw: recorded(value) ? value : undefined, digits },
});
function perOpportunity(label: string, count: number | undefined, opportunities: number, scale = 1): CareerReviewStat[] {
  if (!recorded(count) || !Number.isSafeInteger(count) || count < 0
    || !Number.isSafeInteger(opportunities) || opportunities <= 0) return [];
  return [number(label, count / opportunities * scale, scale === 1 ? 2 : 1)];
}
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
  if (pos === 'RB' && s.passingDownRole === true) regular.push(text('Backfield role', 'Passing downs'));
  if (pos === 'RB' && recorded(s.rushYds) && recorded(s.recYds)) {
    regular.push(number('Yards from scrimmage', s.rushYds + s.recYds));
  }
  if ((pos === 'LB' || pos === 'CB') && recorded(s.forcedFum)) regular.push(number('Forced fumbles', s.forcedFum));
  if (pos === 'EDGE' && recorded(s.passDef)) regular.push(number('Passes defended', s.passDef));
  const rush = s.thirdDownRush;
  if ((pos === 'LB' || pos === 'EDGE') && rush && recorded(rush.calls) && recorded(rush.sacks)) {
    regular.push(text('Third-down rush', `${rush.sacks} extra sacks on ${rush.calls} rushes. Tackles given up: ${rush.calls - rush.sacks}.`));
  }
  if (pos === 'QB' && (recorded(s.rushYds) || recorded(s.rushTd))) {
    regular.push(number('Rushing yards', s.rushYds), number('Rushing touchdowns', s.rushTd));
  }
  if (pos === 'QB' && s.qbRunPackage && typeof s.qbRunPackage === 'object') {
    if ('healthCost' in s.qbRunPackage && recorded(s.qbRunPackage.healthCost)) {
      regular.push(text('Quarterback plan', 'Designed runs'), number('Health lost to extra contact', s.qbRunPackage.healthCost));
    } else if ('unavailable' in s.qbRunPackage && s.qbRunPackage.unavailable === true) {
      regular.push(text('Quarterback plan', 'Designed runs unavailable after camp'));
    }
  }
  const appearances = s.poPlayerGames;
  const teamGames = s.poGames;
  if ((s.teamResult === 'Missed the playoffs' || s.teamResult === 'Missed playoffs') &&
    (teamGames === undefined || teamGames === 0) && !s.poLine && !s.poStats && !appearances) {
    return stats(s.teamResult, regular, [text('Postseason', 'Your team missed the playoffs')]);
  }
  const hasAppearances = pos === 'QB' && recorded(appearances) && Number.isInteger(appearances) && appearances >= 0
    && recorded(teamGames) && Number.isInteger(teamGames) && teamGames > 0 && appearances <= teamGames;
  const postseason = [number('Team games', teamGames)];
  if (hasAppearances) postseason.push(number('Appearances', appearances));
  if (hasAppearances && appearances === 0) return stats(s.teamResult, regular, postseason);
  const box = s.poStats;
  const receiving = ['rec', 'recYds'] as const;
  const defense = ['tackles', 'sacks'] as const;
  const fields: Record<CareerPos, readonly (keyof NonNullable<SeasonLine['poStats']>)[]> = {
    QB: ['passYds', 'passTd', 'ints'], RB: ['rushYds', 'rushTd'], WR: receiving, TE: receiving,
    LB: defense, EDGE: defense, CB: ['tackles', 'passDef'], K: ['fgMade', 'fgAtt'],
  };
  const labels = { passYds: 'Passing yards', passTd: 'Passing touchdowns', ints: 'Interceptions thrown',
    rushYds: 'Rushing yards', rushTd: 'Rushing touchdowns', rec: 'Receptions', recYds: 'Receiving yards',
    tackles: 'Tackles', sacks: 'Sacks', passDef: 'Passes defended', fgMade: 'Field goals made', fgAtt: 'Field goals attempted' };
  const keys = fields[pos];
  if (box && keys?.every(key => recorded(box[key]) && box[key]! >= 0)) {
    postseason.push(...keys.map(key => number(labels[key], box[key])));
  } else {
    postseason.push(text('Performance', s.poLine));
  }
  return stats(s.teamResult, regular, postseason);
}

export function nbaSeasonReview(s: NbaSeasonLine): CareerReviewStats {
  const regular = [number('Points per game', s.ppg), number('Rebounds per game', s.rpg), number('Assists per game', s.apg)];
  const closing = s.lateClock;
  if (closing && (closing.read === 'late-shot' || closing.read === 'late-pass') && recorded(closing.baskets) && recorded(closing.possessions)) {
    regular.push(text('Late-clock plan', `${closing.read === 'late-shot' ? 'Took the shot' : 'Passed to the cutter'}: ${closing.baskets} baskets ${closing.read === 'late-shot' ? 'scored' : 'assisted'} from ${closing.possessions} late-clock sets.`));
  }
  if (recorded(s.mpg)) regular.push(number('Minutes per game', s.mpg, 1));
  if (recorded(s.spg)) regular.push(number('Steals per game', s.spg, 1));
  if (recorded(s.bpg)) regular.push(number('Blocks per game', s.bpg, 1));
  if (recorded(s.clubWins) && recorded(s.clubLosses)) {
    regular.push(text('Team record', `${s.clubWins} wins, ${s.clubLosses} losses`));
  }
  if (recorded(s.restGames) && s.restGames > 0) regular.push(text('Rest plan', `${s.restGames} planned games`));
  if (recorded(s.benchAppearances) && s.benchAppearances > 0) {
    regular.push(number('Bench appearances', s.benchAppearances, 0));
  }
  if (s.teamResult === 'Missed the playoffs' && (s.poGames === undefined || s.poGames === 0)) {
    return stats(s.teamResult, regular, [text('Postseason', 'Your team missed the playoffs')]);
  }
  const postseason = [number('Team games', s.poGames), number('Points per game', s.poPpg), number('Rebounds per game', s.poRpg), number('Assists per game', s.poApg)];
  if (recorded(s.poMpg)) postseason.push(number('Minutes per game', s.poMpg, 1));
  if (recorded(s.poSpg)) postseason.push(number('Steals per game', s.poSpg, 1));
  if (recorded(s.poBpg)) postseason.push(number('Blocks per game', s.poBpg, 1));
  return stats(s.teamResult, regular, postseason);
}

const nflOverviewRates: Partial<Record<CareerPos, { key: keyof SeasonLine; label: string }>> = {
  QB: { key: 'passYds', label: 'Passing yards per appearance' },
  RB: { key: 'rushYds', label: 'Rushing yards per appearance' },
  WR: { key: 'recYds', label: 'Receiving yards per appearance' },
  TE: { key: 'recYds', label: 'Receiving yards per appearance' },
  LB: { key: 'tackles', label: 'Tackles per appearance' },
  CB: { key: 'passDef', label: 'Passes defended per appearance' },
  EDGE: { key: 'sacks', label: 'Sacks per appearance' },
};

export function careerSeasonOverviewStat(season: UsCareerSeason, sport: UsCareerSport['slug'], pos: string) {
  if (season.teamResult === 'SUSPENDED' || !Number.isSafeInteger(season.games) || season.games <= 0) return null;
  if (sport === 'nba') {
    const line = season as NbaSeasonLine;
    const big = pos === 'C' || pos === 'PF';
    const value = big ? line.bpg : line.spg;
    return recorded(value) && value >= 0 ? { label: big ? 'Blocks per game' : 'Steals per game', value: value.toFixed(1) } : null;
  }
  if (sport !== 'nfl') return null;
  const line = season as SeasonLine;
  if (pos === 'K') {
    const { fgMade, fgAtt } = line;
    return recorded(fgMade) && recorded(fgAtt) && Number.isSafeInteger(fgMade) && Number.isSafeInteger(fgAtt)
      && fgAtt > 0 && fgMade >= 0 && fgMade <= fgAtt
      ? { label: 'Field goal percentage', value: `${(100 * fgMade / fgAtt).toFixed(1)}%` } : null;
  }
  const rate = nflOverviewRates[pos as CareerPos];
  if (!rate) return null;
  const value = line[rate.key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? { label: rate.label, value: formatNumber((value / season.games).toFixed(1)) } : null;
}

export function mlbSeasonReview(s: MlbSeasonLine, pos: MlbCareerPos): CareerReviewStats {
  const rates = pos === 'SP' ? perOpportunity('Strikeouts per start', s.so, s.games)
    : pos === 'RP' ? [
      ...perOpportunity('Strikeouts per appearance', s.so, s.games),
      ...perOpportunity('Saves per 100 appearances', recorded(s.saves) && s.saves <= s.games ? s.saves : undefined, s.games, 100),
    ] : perOpportunity('Doubles per 100 games', s.doubles, s.games, 100);
  const regular = pos === 'SP'
    ? [number('Wins', s.wins), number('Losses', s.lossesP), number('ERA', s.era, 2), number('Strikeouts', s.so)]
    : pos === 'RP'
      ? [number('Saves', s.saves), number('Holds', s.holds), number('ERA', s.era, 2), number('Strikeouts', s.so),
        number('Wins', s.wins), number('Losses', s.lossesP)]
      : [number('Batting average', s.avg, 3), number('Home runs', s.hr), number('Runs batted in', s.rbi), number('Stolen bases', s.sb), number('On base percentage', s.obp, 3), number('Doubles', s.doubles)];
  const bullpenRole = pos === 'RP' && (s.bullpenRole === 'closer' || s.bullpenRole === 'setup')
    ? [text('Bullpen role', s.bullpenRole === 'closer' ? 'Closer' : 'Setup')] : [];
  const battingApproach = pos !== 'SP' && pos !== 'RP' && s.contactApproach === true
    ? [text('Batting approach', 'Shorter swing'), number('Hits', s.hits), number('At-bats', s.ab)] : [];
  const changeup = (pos === 'SP' || pos === 'RP') && s.changeup;
  const repertoire = changeup ? [
    text('Changeup development', `${changeup.experienceBefore} to ${Math.min(CHANGEUP_REPS, changeup.experienceBefore + changeup.faced)} of ${CHANGEUP_REPS} outings`),
    number('Two-strike changeup matchups', changeup.faced), number('Extra changeup strikeouts', changeup.strikeouts),
    number('Changeup walks', changeup.walks), number('Health spent on changeup walks', changeup.fatigue),
  ] : [];
  let postseason = [number('Team postseason games', s.poGames)];
  if (pos === 'RP' && recorded(s.poAppearances) && Number.isSafeInteger(s.poAppearances) && s.poAppearances >= 0
    && recorded(s.poGames) && Number.isSafeInteger(s.poGames) && s.poGames > 0 && s.poAppearances <= s.poGames) {
    postseason.push(number('Appearances', s.poAppearances));
    if (s.poAppearances > 0) postseason.push(number('Strikeouts', s.poStrikeouts), number('ERA', s.poEra, 2));
  } else if (s.teamResult === 'Missed October' && (s.poGames === undefined || s.poGames === 0) && !s.poLine) {
    postseason = [text('Postseason', 'Your team missed the playoffs')];
  } else {
    postseason.push(text('Performance', s.poLine));
  }
  return { ...stats(s.teamResult, [...regular, ...rates, ...bullpenRole, ...battingApproach, ...repertoire], postseason), gamesLabel: pos === 'SP' ? 'Starts' : pos === 'RP' ? 'Appearances' : 'Games' };
}

export function nhlSeasonReview(s: NhlSeasonLine, pos: NhlCareerPos): CareerReviewStats {
  const draws = pos === 'C' ? s.defensiveDraws : undefined;
  const tandem = pos === 'G' && recorded(s.tandemStarts);
  const shootout = pos === 'G' ? s.shootout : undefined;
  const { poGames, poStarts } = s;
  const hasStarts = recorded(poStarts) && Number.isInteger(poStarts) && poStarts >= 0
    && recorded(poGames) && Number.isInteger(poGames) && poGames > 0 && poStarts <= poGames;
  const goalieResults = [number('Wins', s.poWins), number('Save percentage', s.poSvpct, 3)];
  const goaliePostseason = hasStarts
    ? [number('Team games', poGames), number('Starts', poStarts), ...(poStarts > 0 ? goalieResults : [])]
    : [number('Games', poGames), ...goalieResults];
  const detail = stats(s.teamResult,
    pos === 'G' ? [number('Wins', s.wins), number('Save percentage', s.svpct, 3),
      ...perOpportunity('Wins per 100 appearances', recorded(s.wins) && s.wins <= s.games ? s.wins : undefined, s.games, 100),
      ...(tandem ? [text('Goalie workload', 'Shared crease'), number('Planned starts', s.tandemStarts)] : []),
      ...(shootout ? [text('Shootout stance', NHL_SHOOTOUT_STANCES[shootout.stance]),
        number('Early shots faced', shootout.earlyShots), number('Dekes faced', shootout.dekes),
        number('Shootout wins', shootout.wins), number('Shootout wins at usual depth', shootout.usualWins),
        ...(recorded(shootout.recoveries) ? [number('Wins saved by a practiced stance', shootout.recoveries)] : [])] : [])]
      : [number('Goals', s.goals), number('Assists', s.assists), number('Points', s.points),
        ...perOpportunity('Points per game', s.points, s.games),
        ...(draws ? [number('Defensive draws won', draws.won), number('Defensive draws lost', draws.taken - draws.won),
          text('Next camp with this club', earnedDrawTrust(draws) ? 'Faceoff edge earned' : 'Usual evaluation')] : [])],
    pos === 'G' ? goaliePostseason
      : [number('Games', s.poGames), number('Goals', s.poGoals), number('Assists', s.poAssists), number('Points', s.poPoints),
        ...(s.poChecking && recorded(s.poChecking.seriesEdge) && recorded(s.poChecking.pointsTraded)
          ? [text('Playoff role', 'Checking line'), number('Series win chance added (percentage points)', s.poChecking.seriesEdge),
             number('Points traded in this run', s.poChecking.pointsTraded)] : [])]);
  return tandem ? { ...detail, gamesLabel: 'Starts' } : detail;
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
    { label: gamesLabel, values: seasons.map(({ season, index }) => ({ index, raw: season.games, value: formatNumber(season.games) })) },
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
