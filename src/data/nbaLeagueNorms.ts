/* nbaLeagueNorms.ts (Round 1103). What the real league looks like, so NBA My Career's lines can be held to it.

   This file imports nothing. Every number in it is sourced in docs/audits/NBA-LINE-NORMS-2026-10.md, with both
   sources, the date read and the verdict. The two anchor seasons are 2003-04 (the era start the game offers)
   and 2025-26 (the last finished season when this was written).

   WHAT IS TWO SOURCED: the league rows, the sixty league leading averages, the award rules except the keys
   listed in NBA_NORMS_PARTIAL.
   WHAT IS DERIVED, never typed: NBA_STARTER_NORMS. scripts/genNbaLeagueNorms.mjs computes the quartiles from
   two table extracts and writes the block between the GENERATED marks below. The extracts hold real players'
   season lines and are not committed; the aggregates are. The starter quartiles rest on one dataset, so every
   one of their keys is PARTIAL and the harness gives each a wider band (the CM_PARTIAL honesty rule).

   Nothing on screen states a league average or names a leader. The game uses these as bars, never as copy. */

export type NbaNormEra = 'y2004' | 'now';
export type NbaNormPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export interface NbaLeagueRow { season: string; year: number; pts: number; reb: number; ast: number; stl: number; blk: number }

/** One club's averages a game across the league, regular season. Two sourced. `year` is the season's start year. */
export const NBA_LEAGUE_PER_GAME: Record<NbaNormEra, NbaLeagueRow> = {
  y2004: { season: '2003-04', year: 2003, pts: 93.4, reb: 42.2, ast: 21.3, stl: 7.9, blk: 5.1 },
  now: { season: '2025-26', year: 2025, pts: 115.6, reb: 43.8, ast: 26.7, stl: 8.4, blk: 4.8 },
};

export interface NbaQuartiles { p25: number; p50: number; p75: number }
export interface NbaStarterNorm { n: number; mpg: NbaQuartiles; pts: NbaQuartiles; reb: NbaQuartiles; ast: NbaQuartiles; stl: NbaQuartiles; blk: NbaQuartiles }

/** Regular starters (started at least half an 82 game season, 41 starts), by listed position.
 *  Derived by scripts/genNbaLeagueNorms.mjs. Do not edit between the marks by hand. */
// GENERATED:START NBA_STARTER_NORMS
export const NBA_STARTER_NORMS: Record<NbaNormEra, Record<NbaNormPos, NbaStarterNorm>> = {
  y2004: {
    PG: { n: 26, mpg: { p25: 30.4, p50: 34.8, p75: 36.5 }, pts: { p25: 10.6, p50: 14.6, p75: 16.8 }, reb: { p25: 2.9, p50: 3.4, p75: 4.1 }, ast: { p25: 5.1, p50: 5.9, p75: 6.8 }, stl: { p25: 1.1, p50: 1.3, p75: 1.6 }, blk: { p25: 0.1, p50: 0.2, p75: 0.3 } },
    SG: { n: 29, mpg: { p25: 32.8, p50: 36, p75: 38.4 }, pts: { p25: 13.6, p50: 17.3, p75: 20.9 }, reb: { p25: 3.5, p50: 4, p75: 5.1 }, ast: { p25: 2.4, p50: 3.2, p75: 4.8 }, stl: { p25: 1.1, p50: 1.3, p75: 1.5 }, blk: { p25: 0.2, p50: 0.4, p75: 0.5 } },
    SF: { n: 27, mpg: { p25: 28.7, p50: 32, p75: 37 }, pts: { p25: 10, p50: 12.9, p75: 18 }, reb: { p25: 3.9, p50: 4.6, p75: 5.9 }, ast: { p25: 1.8, p50: 2.2, p75: 3 }, stl: { p25: 0.9, p50: 1, p75: 1.1 }, blk: { p25: 0.2, p50: 0.3, p75: 0.5 } },
    PF: { n: 28, mpg: { p25: 31.8, p50: 34.7, p75: 36.5 }, pts: { p25: 11.8, p50: 15.1, p75: 17.3 }, reb: { p25: 7.3, p50: 8.6, p75: 10 }, ast: { p25: 1.5, p50: 2.1, p75: 3.2 }, stl: { p25: 0.8, p50: 0.9, p75: 1.1 }, blk: { p25: 0.6, p50: 1.1, p75: 1.6 } },
    C: { n: 27, mpg: { p25: 25.1, p50: 28.7, p75: 32.3 }, pts: { p25: 6.7, p50: 8.7, p75: 11 }, reb: { p25: 6.2, p50: 7.4, p75: 8.6 }, ast: { p25: 0.8, p50: 1, p75: 1.7 }, stl: { p25: 0.5, p50: 0.6, p75: 0.8 }, blk: { p25: 0.9, p50: 1.3, p75: 2 } },
  },
  now: {
    PG: { n: 29, mpg: { p25: 28.5, p50: 31, p75: 33.2 }, pts: { p25: 14.3, p50: 17.3, p75: 23.6 }, reb: { p25: 3.3, p50: 3.9, p75: 4.6 }, ast: { p25: 5.2, p50: 6.1, p75: 7.1 }, stl: { p25: 1, p50: 1.1, p75: 1.4 }, blk: { p25: 0.2, p50: 0.3, p75: 0.5 } },
    SG: { n: 30, mpg: { p25: 26.5, p50: 29.1, p75: 33.4 }, pts: { p25: 11.8, p50: 12.4, p75: 19.2 }, reb: { p25: 3.2, p50: 4, p75: 4.7 }, ast: { p25: 2.1, p50: 2.8, p75: 3.8 }, stl: { p25: 0.7, p50: 1, p75: 1.3 }, blk: { p25: 0.3, p50: 0.4, p75: 0.5 } },
    SF: { n: 34, mpg: { p25: 28.4, p50: 30.3, p75: 32.7 }, pts: { p25: 11.3, p50: 15.2, p75: 21 }, reb: { p25: 3.9, p50: 5.2, p75: 5.8 }, ast: { p25: 2, p50: 3.2, p75: 4.3 }, stl: { p25: 0.8, p50: 1, p75: 1.2 }, blk: { p25: 0.3, p50: 0.5, p75: 0.7 } },
    PF: { n: 27, mpg: { p25: 27.1, p50: 29.7, p75: 33.1 }, pts: { p25: 12, p50: 14.8, p75: 18.2 }, reb: { p25: 4.4, p50: 5.3, p75: 6.8 }, ast: { p25: 1.8, p50: 2.5, p75: 3.4 }, stl: { p25: 0.7, p50: 0.9, p75: 1.1 }, blk: { p25: 0.4, p50: 0.5, p75: 0.8 } },
    C: { n: 29, mpg: { p25: 25, p50: 27.2, p75: 30.1 }, pts: { p25: 10.9, p50: 12.1, p75: 16.3 }, reb: { p25: 7.1, p50: 8, p75: 10 }, ast: { p25: 1.7, p50: 2, p75: 3.1 }, stl: { p25: 0.7, p50: 0.8, p75: 1 }, blk: { p25: 0.7, p50: 0.9, p75: 1.3 } },
  },
};
// GENERATED:END NBA_STARTER_NORMS

export interface NbaLeaderRow { season: string; value: number }
/** The league leading average in each of the ten seasons up to the era's anchor season. Two sourced to one
 *  decimal (the precision both sources agree on). No names. */
export const NBA_LEADERS: Record<NbaNormEra, { pts: NbaLeaderRow[]; reb: NbaLeaderRow[]; ast: NbaLeaderRow[] }> = {
  y2004: {
    pts: [{ season: '1994-95', value: 29.3 }, { season: '1995-96', value: 30.4 }, { season: '1996-97', value: 29.6 }, { season: '1997-98', value: 28.7 }, { season: '1998-99', value: 26.8 }, { season: '1999-00', value: 29.7 }, { season: '2000-01', value: 31.1 }, { season: '2001-02', value: 31.4 }, { season: '2002-03', value: 32.1 }, { season: '2003-04', value: 28.0 }],
    reb: [{ season: '1994-95', value: 16.8 }, { season: '1995-96', value: 14.9 }, { season: '1996-97', value: 16.1 }, { season: '1997-98', value: 15.0 }, { season: '1998-99', value: 13.0 }, { season: '1999-00', value: 14.1 }, { season: '2000-01', value: 13.5 }, { season: '2001-02', value: 13.0 }, { season: '2002-03', value: 15.4 }, { season: '2003-04', value: 13.9 }],
    ast: [{ season: '1994-95', value: 12.3 }, { season: '1995-96', value: 11.2 }, { season: '1996-97', value: 11.4 }, { season: '1997-98', value: 10.5 }, { season: '1998-99', value: 10.8 }, { season: '1999-00', value: 10.1 }, { season: '2000-01', value: 9.8 }, { season: '2001-02', value: 10.9 }, { season: '2002-03', value: 8.9 }, { season: '2003-04', value: 9.2 }],
  },
  now: {
    pts: [{ season: '2016-17', value: 31.6 }, { season: '2017-18', value: 30.4 }, { season: '2018-19', value: 36.1 }, { season: '2019-20', value: 34.3 }, { season: '2020-21', value: 32.0 }, { season: '2021-22', value: 30.6 }, { season: '2022-23', value: 33.1 }, { season: '2023-24', value: 33.9 }, { season: '2024-25', value: 32.7 }, { season: '2025-26', value: 33.5 }],
    reb: [{ season: '2016-17', value: 14.1 }, { season: '2017-18', value: 16.0 }, { season: '2018-19', value: 15.6 }, { season: '2019-20', value: 15.2 }, { season: '2020-21', value: 14.3 }, { season: '2021-22', value: 14.7 }, { season: '2022-23', value: 12.3 }, { season: '2023-24', value: 13.7 }, { season: '2024-25', value: 13.9 }, { season: '2025-26', value: 12.9 }],
    ast: [{ season: '2016-17', value: 11.2 }, { season: '2017-18', value: 10.3 }, { season: '2018-19', value: 10.7 }, { season: '2019-20', value: 10.2 }, { season: '2020-21', value: 11.7 }, { season: '2021-22', value: 10.8 }, { season: '2022-23', value: 10.7 }, { season: '2023-24', value: 10.9 }, { season: '2024-25', value: 11.6 }, { season: '2025-26', value: 10.7 }],
  },
};

/** The real award rules the engine applies. Each number is sourced in the audit note. A `From` year is the
 *  start year of the first season the rule applied to (2023 is the 2023-24 season). */
export const NBA_AWARD_RULES = {
  /** MVP, Defensive Player, Most Improved, All-NBA and All-Defensive need 65 of 82 games from 2023-24. Rookie of
   *  the Year, All-Rookie and Sixth Man are outside it. The real rule's injury exception (62 games and a season
   *  ending injury) is not modelled: the engine does not know when in the season he was hurt. */
  gamesBarFrom: 2023, gamesBar: 65, gamesBarOf: 82,
  /** To lead the league in a per game stat: 70 percent of the club's games (58 of 82) from 2013-14. */
  statTitleShare: 0.7, statTitleShareFrom: 2013,
  /** Before it: 70 games, or the season total. */
  statTitleGamesBefore: 70, statTitleTotalsBefore: { pts: 1400, reb: 800, ast: 400 },
  /** The one short season before the share that a career can play, keyed by its start year: the 66 game
   *  2011-12 season asked for 56 games, or 1,127 points, 644 rebounds, 321 assists. One source (PARTIAL). */
  statTitleShortBefore: { 2011: { games: 56, totals: { pts: 1127, reb: 644, ast: 321 } } } as Record<number, { games: number; totals: { pts: number; reb: number; ast: number } }>,
  /** 24 All-Stars: five starters a conference by a weighted vote (fans half of it from the 2016-17 season; the
   *  fans alone before that), seven reserves a conference picked by the head coaches. */
  allStarPicks: 24, allStarStarters: 10, allStarFanShare: 0.5, allStarFanShareFrom: 2016,
  /** Three All-NBA teams of five, two All-Defensive teams of five, two All-Rookie teams of five. */
  allNbaPicks: 15, allDefensivePicks: 10, allRookiePicks: 10,
} as const;

const ERAS: NbaNormEra[] = ['y2004', 'now'];
const POSITIONS: NbaNormPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const NORM_STATS = ['mpg', 'pts', 'reb', 'ast', 'stl', 'blk'] as const;

/** Keys whose number rests on one dataset: the same honesty rule as CM_PARTIAL. Every starter quartile (one
 *  table a season, no second table with the five positions and games started was to be had), and four rule
 *  facts read from one source each (the audit note says which). A harness check on a partial key is looser. */
export const NBA_NORMS_PARTIAL: string[] = [
  ...ERAS.flatMap(e => POSITIONS.flatMap(p => NORM_STATS.map(s => `${e}.${p}.${s}`))),
  'rules.statTitleShareFrom', 'rules.statTitleGamesBefore', 'rules.statTitleTotalsBefore', 'rules.statTitleShortBefore',
];

type Five = { pts: number; reb: number; ast: number; stl: number; blk: number };
const FIVE = ['pts', 'reb', 'ast', 'stl', 'blk'] as const;
/** How far `year` sits between the two anchor seasons: 0 at 2003-04 or before, 1 at 2025-26 or after. */
function eraMix(year: number): number {
  const a = NBA_LEAGUE_PER_GAME.y2004.year;
  const b = NBA_LEAGUE_PER_GAME.now.year;
  return Math.max(0, Math.min(1, (year - a) / (b - a)));
}

/** The league's level in `year` against the modern anchor: a straight line between the two sourced seasons,
 *  flat outside them. Derived, never typed. A career that starts in 2026 always gets 1. The line is the game's
 *  rule, not a claim about any season in between. */
export function nbaEraScale(year: number): Five {
  const t = eraMix(year);
  const old = NBA_LEAGUE_PER_GAME.y2004;
  const now = NBA_LEAGUE_PER_GAME.now;
  const out = {} as Five;
  for (const k of FIVE) out[k] = (old[k] + (now[k] - old[k]) * t) / now[k];
  return out;
}

function meanSd(rows: NbaLeaderRow[]): { mean: number; sd: number } {
  const mean = rows.reduce((s, r) => s + r.value, 0) / rows.length;
  const sd = Math.sqrt(rows.reduce((s, r) => s + (r.value - mean) ** 2, 0) / rows.length);
  return { mean, sd };
}

/** Mean and sd of the ten sourced leaders, each era's own, mixed along the same straight line as the level. */
export function nbaLeaderBar(stat: 'pts' | 'reb' | 'ast', year: number): { mean: number; sd: number } {
  const t = eraMix(year);
  const old = meanSd(NBA_LEADERS.y2004[stat]);
  const now = meanSd(NBA_LEADERS.now[stat]);
  return { mean: old.mean + (now.mean - old.mean) * t, sd: old.sd + (now.sd - old.sd) * t };
}

/** The same averages with the era's level divided out: what the awards and the rival judge, so a 2004 season
 *  is measured against 2004's league and never against today's. The saved and printed line stays raw. */
export function nbaEraNeutral<T extends { ppg: number; rpg: number; apg: number; spg?: number; bpg?: number }>(line: T, year: number): T {
  const s = nbaEraScale(year);
  const out = { ...line, ppg: line.ppg / s.pts, rpg: line.rpg / s.reb, apg: line.apg / s.ast };
  if (typeof line.spg === 'number') out.spg = line.spg / s.stl;
  if (typeof line.bpg === 'number') out.bpg = line.bpg / s.blk;
  return out;
}
