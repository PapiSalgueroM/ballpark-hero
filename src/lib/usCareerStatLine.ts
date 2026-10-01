/* ─── Round 833: what a season and a career read like, per position ─────────

   The four American careers each printed their stat line from a private copy
   of one ternary inside the board, and two of the copies had a hole in them.
   The NFL board knew three shapes (passer, runner, receiver), so a linebacker,
   a corner, an edge rusher or a kicker fell through to the receiver's line and
   read "undefined rec, undefined yds, undefined TD" on the season card, the
   career log, the retirement list and the hub. The MLB board knew two (the
   starter and the bat), so a reliever read ".000, undefined HR, undefined RBI".
   The retirement card had the same hole one level up: every NFL defender and
   kicker retired on "0 catches for 0 yards, 0 touchdowns".

   Everything that turns a season or a career into words now lives here, one
   function per sport, so the boards print what the engine actually recorded
   for that position and nothing else. Two rules hold for every line:

   - A part the season never recorded is left out, never printed as a word or a
     placeholder number. A line with nothing left says so plainly.
   - A suspended season is the same sentence in all four games.

   This file imports types only, so the engines and the boards can both import
   it without a cycle. */

import type { CareerPos, SeasonLine } from './nflMyCareer';
import type { NbaSeasonLine } from './nbaMyCareer';
import type { MlbCareerPos, MlbSeasonLine } from './mlbMyCareer';
import type { NhlCareerPos, NhlSeasonLine } from './nhlMyCareer';

export const SUSPENDED_STAT_LINE = 'Suspended, no season played';
export const NO_STATS_LINE = 'No stats recorded';

/** One piece of a line: the recorded number and how to say it. */
type Part = readonly [value: number | undefined | null, say: (n: number) => string];

const isNum = (v: number | undefined | null): v is number => typeof v === 'number' && Number.isFinite(v);

/** The recorded parts, joined. Missing parts drop out rather than print. */
export function joinStatParts(parts: readonly Part[]): string {
  const said = parts.filter(([v]) => isNum(v)).map(([v, say]) => say(v as number));
  return said.length ? said.join(', ') : NO_STATS_LINE;
}

/** "1 sack", "2 sacks", "1 pass defended", "3 passes defended". */
export function countOf(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

const seasonLine = (teamResult: string, parts: readonly Part[]): string =>
  teamResult === 'SUSPENDED' ? SUSPENDED_STAT_LINE : joinStatParts(parts);

/* ─── NFL ─────────────────────────────────────────────────────────────────── */

/** One NFL season, in the numbers simSeason writes for that position. */
export function nflStatLine(s: SeasonLine, p: CareerPos): string {
  switch (p) {
    case 'QB': return seasonLine(s.teamResult, [[s.passYds, n => `${n} yds`], [s.passTd, n => `${n} TD`], [s.ints, n => `${n} INT`]]);
    case 'RB': return seasonLine(s.teamResult, [[s.rushYds, n => `${n} rush yds`], [s.rushTd, n => `${n} TD`], [s.rec, n => `${n} rec`]]);
    case 'WR':
    case 'TE': return seasonLine(s.teamResult, [[s.rec, n => `${n} rec`], [s.recYds, n => `${n} yds`], [s.recTd, n => `${n} TD`]]);
    case 'LB': return seasonLine(s.teamResult, [[s.tackles, n => countOf(n, 'tackle', 'tackles')], [s.sacks, n => countOf(n, 'sack', 'sacks')], [s.picks, n => `${n} INT`]]);
    case 'CB': return seasonLine(s.teamResult, [[s.picks, n => `${n} INT`], [s.passDef, n => countOf(n, 'pass defended', 'passes defended')], [s.tackles, n => countOf(n, 'tackle', 'tackles')]]);
    case 'EDGE': return seasonLine(s.teamResult, [[s.sacks, n => countOf(n, 'sack', 'sacks')], [s.tackles, n => countOf(n, 'tackle', 'tackles')], [s.forcedFum, n => countOf(n, 'forced fumble', 'forced fumbles')]]);
    case 'K': return seasonLine(s.teamResult, [
      [s.fgMade, n => (isNum(s.fgAtt) ? `${n} of ${s.fgAtt} FG` : `${n} FG`)],
      [s.longFg, n => `long of ${n}`],
    ]);
    default: return seasonLine(s.teamResult, []);
  }
}

/** Career sums the NFL save never kept: every counting stat any position records. */
export interface NflCareerSums {
  passYds: number; passTd: number; ints: number;
  rushYds: number; rushTd: number;
  rec: number; recYds: number; recTd: number;
  tackles: number; sacks: number; picks: number; passDef: number; forcedFum: number;
  fgMade: number; fgAtt: number;
}

/** The retirement card's stat bullet for an NFL career. */
export function nflCareerStatBullet(t: NflCareerSums, p: CareerPos): string {
  switch (p) {
    case 'QB': return `${t.passYds.toLocaleString()} passing yards, ${t.passTd} touchdowns`;
    case 'RB': return `${t.rushYds.toLocaleString()} rushing yards, ${t.rushTd} touchdowns`;
    case 'WR':
    case 'TE': return `${t.rec} catches for ${t.recYds.toLocaleString()} yards, ${t.recTd} touchdowns`;
    case 'LB': return `${countOf(t.tackles, 'tackle', 'tackles')}, ${countOf(t.sacks, 'sack', 'sacks')}, ${countOf(t.picks, 'interception', 'interceptions')}`;
    case 'CB': return `${countOf(t.picks, 'interception', 'interceptions')}, ${countOf(t.passDef, 'pass defended', 'passes defended')}, ${countOf(t.tackles, 'tackle', 'tackles')}`;
    case 'EDGE': return `${countOf(t.sacks, 'sack', 'sacks')}, ${countOf(t.tackles, 'tackle', 'tackles')}, ${countOf(t.forcedFum, 'forced fumble', 'forced fumbles')}`;
    case 'K': return `${t.fgMade} of ${t.fgAtt} field goals made`;
    default: return '';
  }
}

/** The hub's "career so far" figure: the one number that position is about. */
export function nflCareerSoFar(t: NflCareerSums, p: CareerPos): string {
  switch (p) {
    case 'QB': return `${t.passYds.toLocaleString()} pass yds`;
    case 'RB': return `${t.rushYds.toLocaleString()} rush yds`;
    case 'WR':
    case 'TE': return `${t.recYds.toLocaleString()} rec yds`;
    case 'LB': return countOf(t.tackles, 'tackle', 'tackles');
    case 'CB': return `${t.picks} INT`;
    case 'EDGE': return countOf(t.sacks, 'sack', 'sacks');
    case 'K': return `${t.fgMade} FG made`;
    default: return '';
  }
}

/** A defender's big award is Defensive Player of the Year, counted on the same
 *  meter as the MVP (simSeason adds both to mvps, and the MVP table returns
 *  nothing for a defender), so the word follows the position. */
export function nflMajorAward(p: CareerPos): { one: string; many: string } {
  return p === 'LB' || p === 'CB' || p === 'EDGE'
    ? { one: 'DPOY', many: 'DPOYs' }
    : { one: 'MVP', many: 'MVPs' };
}

/* ─── NBA ─────────────────────────────────────────────────────────────────── */

/** One NBA season. Every position records the same three averages. */
export function nbaStatLine(s: NbaSeasonLine): string {
  return seasonLine(s.teamResult, [[s.ppg, n => `${n} ppg`], [s.rpg, n => `${n} rpg`], [s.apg, n => `${n} apg`]]);
}

/* ─── MLB ─────────────────────────────────────────────────────────────────── */

const avg3 = (n: number): string => `.${String(Math.round(n * 1000)).padStart(3, '0')}`;

/** One MLB season: a starter's record, a reliever's bullpen line, or a bat. */
export function mlbStatLine(s: MlbSeasonLine, p: MlbCareerPos): string {
  if (p === 'SP') {
    return seasonLine(s.teamResult, [
      [s.wins, n => (isNum(s.lossesP) ? `${n}-${s.lossesP}` : countOf(n, 'win', 'wins'))],
      [s.era, n => `${n.toFixed(2)} ERA`],
      [s.so, n => `${n} K`],
    ]);
  }
  if (p === 'RP') {
    return seasonLine(s.teamResult, [
      [s.saves, n => countOf(n, 'save', 'saves')],
      [s.holds, n => countOf(n, 'hold', 'holds')],
      [s.era, n => `${n.toFixed(2)} ERA`],
      [s.so, n => `${n} K`],
    ]);
  }
  return seasonLine(s.teamResult, [[s.avg, avg3], [s.hr, n => `${n} HR`], [s.rbi, n => `${n} RBI`]]);
}

export interface MlbCareerSums { hr: number; rbi: number; sb: number; wins: number; so: number; saves: number; holds: number }

/** The retirement card's stat bullet for an MLB career. A setup man's job
 *  is holds (simMlbSeason gives him a handful of saves and up to 41 holds a
 *  year), so a reliever's career carries both, never saves alone. */
export function mlbCareerStatBullet(t: MlbCareerSums, p: MlbCareerPos): string {
  if (p === 'SP') return `${t.wins} wins, ${t.so.toLocaleString()} strikeouts`;
  if (p === 'RP') return `${countOf(t.saves, 'save', 'saves')}, ${countOf(t.holds, 'hold', 'holds')}, ${t.so.toLocaleString()} strikeouts`;
  return `${t.hr} home runs, ${t.rbi.toLocaleString()} RBI, ${t.sb} steals`;
}

/** The hub's "career so far" figure for an MLB career. */
export function mlbCareerSoFar(t: MlbCareerSums, p: MlbCareerPos): string {
  if (p === 'SP') return `${t.wins} career wins`;
  if (p === 'RP') return `${countOf(t.saves, 'save', 'saves')} and ${countOf(t.holds, 'hold', 'holds')}`;
  return `${t.hr} career home runs`;
}

/** Pitchers win the Cy Young on the meter hitters fill with MVPs. */
export function mlbMajorAward(p: MlbCareerPos): { one: string; many: string } {
  return p === 'SP' || p === 'RP' ? { one: 'Cy Young', many: 'Cy Youngs' } : { one: 'MVP', many: 'MVPs' };
}

/* ─── NHL ─────────────────────────────────────────────────────────────────── */

/** One NHL season: a goalie's wins and save percentage, or a skater's points. */
export function nhlStatLine(s: NhlSeasonLine, p: NhlCareerPos): string {
  if (p === 'G') return seasonLine(s.teamResult, [[s.wins, n => `${n} W`], [s.svpct, n => `${avg3(n)} SV%`]]);
  return seasonLine(s.teamResult, [[s.goals, n => `${n} G`], [s.assists, n => `${n} A`], [s.points, n => `${n} P`]]);
}

/** The trophy the position chases: the Vezina in net, the Norris on the blue
 *  line, the Hart up front. simNhlSeason counts all three on one meter. */
export function nhlMajorAward(p: NhlCareerPos): { one: string; many: string } {
  return p === 'G' ? { one: 'Vezina', many: 'Vezinas' }
    : p === 'D' ? { one: 'Norris Trophy', many: 'Norris Trophies' }
    : { one: 'Hart', many: 'Harts' };
}
