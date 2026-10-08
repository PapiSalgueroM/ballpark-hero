/* Round 1104: which city and name a franchise carried in which season, for the
   US careers' throwback eras. One row per span of one franchise under one
   engine club id. The ids are the engines' own (the two club lists in
   src/lib/nflMyCareer.ts), so a row can be looked up from a save's `team`.

   This file imports nothing. `year` is the year a season STARTS in.

   WHAT READS IT. In Round 1104 nothing in the game does: the ledger, its
   resolver and sameFranchise ship as tested data, and a later round binds
   them to the careers together with every reader that asks "is this the same
   club?" (the press room, the Hall's club tally, the coach profile, the rival
   beats). Until then a 2005 career keeps the club ids and names it has today.

   `from: 2005` on a first row is the first season the game can reach (the NFL
   throwback starts in 2005). It is not a founding year. A last row with no
   `to` is the latest verified state carried forward.

   SOURCES, all read 2026-10-07. Two independent sources agree on every row.

   Rams, in Los Angeles from the 2016 season:
   1. The Boston Globe, 12 January 2016, "NFL approves Rams' return to LA, but
      other teams still in limbo" (owners voted 30 to 2 for a move for the
      2016 season).
   2. CNN Money, 12 January 2016, "NFL gives Rams approval to return to LA,
      Chargers may join them".
   Chargers, in Los Angeles from the 2017 season:
   1. FOX 11 Los Angeles (Associated Press), 12 January 2017, "It's official!
      San Diego Chargers announce move to Los Angeles" (the move begins with
      the 2017 season).
   2. Pollstar, 12 January 2017, "Chargers Announce L.A. Move".
   Raiders, in Las Vegas from the 2020 season:
   1. CBS Sports, "Raiders officially say goodbye to Oakland, relocate to Las
      Vegas for 2020 and beyond" (22 January 2020).
   2. Pro Football Hall of Fame, January 2020, "Raiders Officially Announce
      Las Vegas Raiders Title".
   Washington, the Commanders from the 2022 season:
   1. Stars and Stripes, 2 February 2022, "Washington Football Team announces
      Commanders as new name".
   2. CBS News, 2 February 2022, "Washington NFL Team Reveals Its New Name:
      The Commanders".
   Before 2022 the Washington row is the city alone (name null). That is the
   rule src/lib/nflMyCareer.ts already keeps for its 2005 list: the nickname
   of those years is retired and stays out of this site, and in 2020 and 2021
   the club played as the Washington Football Team, which the city alone also
   covers.

   In repo cross check, not a source: scripts/lib/nflFranchiseCodes.mjs
   (Round 404) carries the same three moves.

   Facts confirmed by both sources: 4 franchises, 8 rows. NBA, MLB and NHL
   rows are not verified yet and are empty: an empty list means "nothing is
   known to have changed", and franchiseAt answers null. */

export type UsFranchiseLeague = 'nfl' | 'nba' | 'mlb' | 'nhl';

/** One span of one franchise under one engine club id. */
export interface FranchiseRow {
  /** The franchise, the same key on every row of one club's history. */
  franchise: string;
  /** The engine's club id in this span. */
  id: string;
  /** First season of the span (the year it starts in). */
  from: number;
  /** Last season of the span. Left off on the span that is still running. */
  to?: number;
  city: string;
  /** The nickname, or null when the club is written by its city alone. */
  name: string | null;
}

export const US_FRANCHISE_YEARS: Record<UsFranchiseLeague, readonly FranchiseRow[]> = {
  nfl: [
    { franchise: 'rams', id: 'STL', from: 2005, to: 2015, city: 'St. Louis', name: 'Rams' },
    { franchise: 'rams', id: 'LA', from: 2016, city: 'Los Angeles', name: 'Rams' },
    { franchise: 'chargers', id: 'SD', from: 2005, to: 2016, city: 'San Diego', name: 'Chargers' },
    { franchise: 'chargers', id: 'LAC', from: 2017, city: 'Los Angeles', name: 'Chargers' },
    { franchise: 'raiders', id: 'OAK', from: 2005, to: 2019, city: 'Oakland', name: 'Raiders' },
    { franchise: 'raiders', id: 'LV', from: 2020, city: 'Las Vegas', name: 'Raiders' },
    { franchise: 'washington', id: 'WSH', from: 2005, to: 2021, city: 'Washington', name: null },
    { franchise: 'washington', id: 'WAS', from: 2022, city: 'Washington', name: 'Commanders' },
  ],
  nba: [],
  mlb: [],
  nhl: [],
};

const franchiseOf = (sport: UsFranchiseLeague, clubId: string): string | null =>
  US_FRANCHISE_YEARS[sport].find(r => r.id === clubId)?.franchise ?? null;

/** The row the franchise that `clubId` belongs to carries in `year`, or null
 *  when the ledger has no row for it (nothing is known to have changed: use
 *  the engine's own list). Works from either id of a franchise. */
export function franchiseAt(sport: UsFranchiseLeague, clubId: string, year: number): FranchiseRow | null {
  const franchise = franchiseOf(sport, clubId);
  if (!franchise) return null;
  return US_FRANCHISE_YEARS[sport].find(r => r.franchise === franchise && year >= r.from && (r.to === undefined || year <= r.to)) ?? null;
}

/** "Los Angeles Rams", or the city alone when the row carries no nickname. */
export function franchiseLabel(row: FranchiseRow): string {
  return row.name ? `${row.city} ${row.name}` : row.city;
}

/** Whether two club ids are one club: the same id, or two ids of one
 *  franchise (STL and LA). Anything that asks "did he change clubs?" must ask
 *  this and never compare ids, or a relocation reads as a trade. */
export function sameFranchise(sport: UsFranchiseLeague, a: string, b: string): boolean {
  if (a === b) return true;
  const fa = franchiseOf(sport, a);
  return fa !== null && fa === franchiseOf(sport, b);
}
