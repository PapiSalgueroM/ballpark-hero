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

   Sport imports are types only; the display formatter has no engine dependency, so both can import
   it without a cycle. */

import type { CareerPos, SeasonLine } from './nflMyCareer';
import type { NbaSeasonLine } from './nbaMyCareer';
import type { MlbCareerPos, MlbSeasonLine } from './mlbMyCareer';
import type { NhlCareerPos, NhlSeasonLine } from './nhlMyCareer';
import { formatNumber } from './formatNumber';

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

const displayCountOf = (n: number, one: string, many: string): string =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

const seasonLine = (teamResult: string, parts: readonly Part[]): string =>
  teamResult === 'SUSPENDED' ? SUSPENDED_STAT_LINE : joinStatParts(parts);

/* ─── NFL ─────────────────────────────────────────────────────────────────── */

/** One NFL season, in the numbers simSeason writes for that position. */
export function nflStatLine(s: SeasonLine, p: CareerPos): string {
  switch (p) {
    case 'QB': return seasonLine(s.teamResult, [[s.passYds, n => `${formatNumber(n)} yds`], [s.passTd, n => `${formatNumber(n)} TD`], [s.ints, n => `${formatNumber(n)} INT`]]);
    case 'RB': return seasonLine(s.teamResult, [[s.rushYds, n => `${formatNumber(n)} rush yds`], [s.rushTd, n => `${formatNumber(n)} TD`], [s.rec, n => `${formatNumber(n)} rec`]]);
    case 'WR':
    case 'TE': return seasonLine(s.teamResult, [[s.rec, n => `${formatNumber(n)} rec`], [s.recYds, n => `${formatNumber(n)} yds`], [s.recTd, n => `${formatNumber(n)} TD`]]);
    case 'LB': return seasonLine(s.teamResult, [[s.tackles, n => displayCountOf(n, 'tackle', 'tackles')], [s.sacks, n => displayCountOf(n, 'sack', 'sacks')], [s.picks, n => `${formatNumber(n)} INT`]]);
    case 'CB': return seasonLine(s.teamResult, [[s.picks, n => `${formatNumber(n)} INT`], [s.passDef, n => displayCountOf(n, 'pass defended', 'passes defended')], [s.tackles, n => displayCountOf(n, 'tackle', 'tackles')]]);
    case 'EDGE': return seasonLine(s.teamResult, [[s.sacks, n => displayCountOf(n, 'sack', 'sacks')], [s.tackles, n => displayCountOf(n, 'tackle', 'tackles')], [s.forcedFum, n => displayCountOf(n, 'forced fumble', 'forced fumbles')]]);
    case 'K': return seasonLine(s.teamResult, [
      [s.fgMade, n => (isNum(s.fgAtt) ? `${formatNumber(n)} of ${formatNumber(s.fgAtt)} FG` : `${formatNumber(n)} FG`)],
      [s.longFg, n => `long of ${formatNumber(n)}`],
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
    case 'QB': return `${t.passYds.toLocaleString('en-US')} passing yards, ${formatNumber(t.passTd)} touchdowns`;
    case 'RB': return `${t.rushYds.toLocaleString('en-US')} rushing yards, ${formatNumber(t.rushTd)} touchdowns`;
    case 'WR':
    case 'TE': return `${formatNumber(t.rec)} catches for ${t.recYds.toLocaleString('en-US')} yards, ${formatNumber(t.recTd)} touchdowns`;
    case 'LB': return `${displayCountOf(t.tackles, 'tackle', 'tackles')}, ${displayCountOf(t.sacks, 'sack', 'sacks')}, ${displayCountOf(t.picks, 'interception', 'interceptions')}`;
    case 'CB': return `${displayCountOf(t.picks, 'interception', 'interceptions')}, ${displayCountOf(t.passDef, 'pass defended', 'passes defended')}, ${displayCountOf(t.tackles, 'tackle', 'tackles')}`;
    case 'EDGE': return `${displayCountOf(t.sacks, 'sack', 'sacks')}, ${displayCountOf(t.tackles, 'tackle', 'tackles')}, ${displayCountOf(t.forcedFum, 'forced fumble', 'forced fumbles')}`;
    case 'K': return `${formatNumber(t.fgMade)} of ${formatNumber(t.fgAtt)} field goals made`;
    default: return '';
  }
}

/** The hub's "career so far" figure: the one number that position is about. */
export function nflCareerSoFar(t: NflCareerSums, p: CareerPos): string {
  switch (p) {
    case 'QB': return `${t.passYds.toLocaleString('en-US')} pass yds`;
    case 'RB': return `${t.rushYds.toLocaleString('en-US')} rush yds`;
    case 'WR':
    case 'TE': return `${t.recYds.toLocaleString('en-US')} rec yds`;
    case 'LB': return displayCountOf(t.tackles, 'tackle', 'tackles');
    case 'CB': return `${formatNumber(t.picks)} INT`;
    case 'EDGE': return displayCountOf(t.sacks, 'sack', 'sacks');
    case 'K': return `${formatNumber(t.fgMade)} FG made`;
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

/** One NBA season. Every position records the same three averages. A season on the Round 1103 line (it
 *  recorded minutes) prints each of them to one decimal, "17.0 ppg"; a season saved before it prints exactly
 *  what it always did. Three parts on purpose: the hub's Career Log tile has room for three and cuts a longer
 *  line off, and the season card says the minutes, steals and blocks in a note of its own. */
export function nbaStatLine(s: Pick<NbaSeasonLine, 'ppg' | 'rpg' | 'apg' | 'mpg' | 'teamResult'>): string {
  const one = isNum(s.mpg);
  const avg = (n: number): string => (one ? n.toFixed(1) : formatNumber(n));
  return seasonLine(s.teamResult, [[s.ppg, n => `${avg(n)} ppg`], [s.rpg, n => `${avg(n)} rpg`], [s.apg, n => `${avg(n)} apg`]]);
}

/** Round 1103: the whole line of a new season, six parts, for a row with room for it. A season saved before
 *  Round 1103 recorded three, so this prints the same three nbaStatLine does. Abbreviations only. */
export function nbaStatLineFull(s: NbaSeasonLine): string {
  const one = isNum(s.mpg);
  const avg = (n: number): string => (one ? n.toFixed(1) : formatNumber(n));
  return seasonLine(s.teamResult, [
    [s.ppg, n => `${avg(n)} ppg`], [s.rpg, n => `${avg(n)} rpg`], [s.apg, n => `${avg(n)} apg`],
    [s.spg, n => `${n.toFixed(1)} spg`], [s.bpg, n => `${n.toFixed(1)} bpg`], [s.mpg, n => `${n.toFixed(1)} mpg`],
  ]);
}

/* ─── MLB ─────────────────────────────────────────────────────────────────── */

const avg3 = (n: number): string => `.${String(Math.round(n * 1000)).padStart(3, '0')}`;

/** One MLB season: a starter's record, a reliever's bullpen line, or a bat. */
export function mlbStatLine(s: MlbSeasonLine, p: MlbCareerPos): string {
  if (p === 'SP') {
    return seasonLine(s.teamResult, [
      [s.wins, n => (isNum(s.lossesP) ? `${formatNumber(n)}-${formatNumber(s.lossesP)}` : displayCountOf(n, 'win', 'wins'))],
      [s.era, n => `${n.toFixed(2)} ERA`],
      [s.so, n => `${formatNumber(n)} K`],
    ]);
  }
  if (p === 'RP') {
    return seasonLine(s.teamResult, [
      [s.saves, n => displayCountOf(n, 'save', 'saves')],
      [s.holds, n => displayCountOf(n, 'hold', 'holds')],
      [s.era, n => `${n.toFixed(2)} ERA`],
      [s.so, n => `${formatNumber(n)} K`],
    ]);
  }
  return seasonLine(s.teamResult, [[s.avg, avg3], [s.hr, n => `${formatNumber(n)} HR`], [s.rbi, n => `${formatNumber(n)} RBI`]]);
}

export interface MlbCareerSums { hr: number; rbi: number; sb: number; wins: number; so: number; saves: number; holds: number }

/** The retirement card's stat bullet for an MLB career. A setup man's job
 *  is holds (simMlbSeason gives him a handful of saves and up to 41 holds a
 *  year), so a reliever's career carries both, never saves alone. */
export function mlbCareerStatBullet(t: MlbCareerSums, p: MlbCareerPos): string {
  if (p === 'SP') return `${formatNumber(t.wins)} wins, ${t.so.toLocaleString('en-US')} strikeouts`;
  if (p === 'RP') return `${displayCountOf(t.saves, 'save', 'saves')}, ${displayCountOf(t.holds, 'hold', 'holds')}, ${t.so.toLocaleString('en-US')} strikeouts`;
  return `${formatNumber(t.hr)} home runs, ${t.rbi.toLocaleString('en-US')} RBI, ${formatNumber(t.sb)} steals`;
}

/** The hub's "career so far" figure for an MLB career. */
export function mlbCareerSoFar(t: MlbCareerSums, p: MlbCareerPos): string {
  if (p === 'SP') return `${formatNumber(t.wins)} career wins`;
  if (p === 'RP') return `${displayCountOf(t.saves, 'save', 'saves')} and ${displayCountOf(t.holds, 'hold', 'holds')}`;
  return `${formatNumber(t.hr)} career home runs`;
}

/** Pitchers win the Cy Young on the meter hitters fill with MVPs. */
export function mlbMajorAward(p: MlbCareerPos): { one: string; many: string } {
  return p === 'SP' || p === 'RP' ? { one: 'Cy Young', many: 'Cy Youngs' } : { one: 'MVP', many: 'MVPs' };
}

/* ─── NHL ─────────────────────────────────────────────────────────────────── */

/** One NHL season: a goalie's wins and save percentage, or a skater's points. */
export function nhlStatLine(s: NhlSeasonLine, p: NhlCareerPos): string {
  if (p === 'G') return seasonLine(s.teamResult, [[s.wins, n => `${formatNumber(n)} W`], [s.svpct, n => `${avg3(n)} SV%`]]);
  return seasonLine(s.teamResult, [[s.goals, n => `${formatNumber(n)} G`], [s.assists, n => `${formatNumber(n)} A`], [s.points, n => `${formatNumber(n)} P`]]);
}

/** The trophy the position chases: the Vezina in net, the Norris on the blue
 *  line, the Hart up front. simNhlSeason counts all three on one meter. */
export function nhlMajorAward(p: NhlCareerPos): { one: string; many: string } {
  return p === 'G' ? { one: 'Vezina', many: 'Vezinas' }
    : p === 'D' ? { one: 'Norris Trophy', many: 'Norris Trophies' }
    : { one: 'Hart', many: 'Harts' };
}
