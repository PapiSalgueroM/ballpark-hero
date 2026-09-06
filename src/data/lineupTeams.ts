import type { TeamAssignment } from '@/types/lineupBuilder';

export const clubs: string[] = [
  'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
  'PSG', 'Chelsea', 'Arsenal', 'Manchester United', 'Juventus',
  'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'Tottenham',
  'Napoli', 'Benfica', 'Porto', 'Ajax', 'Bayer Leverkusen',
  'Roma', 'Sevilla', 'Sporting CP', 'Newcastle', 'Aston Villa',
  'West Ham', 'Marseille', 'Lyon', 'Celtic', 'Galatasaray',
];

export const nations: string[] = [
  'Argentina', 'France', 'Brazil', 'England', 'Belgium',
  'Croatia', 'Netherlands', 'Portugal', 'Spain', 'Italy',
  'Germany', 'Uruguay', 'Colombia', 'USA', 'Mexico',
  'Senegal', 'Japan', 'South Korea', 'Nigeria', 'Denmark',
  'Switzerland', 'Morocco', 'Serbia', 'Poland', 'Cameroon',
];

const allTeams: TeamAssignment[] = [
  ...clubs.map((name) => ({ name, isNation: false })),
  ...nations.map((name) => ({ name, isNation: true })),
];

/** Return a shuffled list of 11 unique teams for a game session */
export function getRandomTeamAssignments(count = 11): TeamAssignment[] {
  const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * THE EXACT STRINGS player_market_values USES FOR THE THIRTY CLUBS ABOVE.
 *
 * Round 483. Until this round the dropdown scoped its pool with a substring
 * `ilike` on the club label, and the comment that used to live here admitted
 * it matched "Real Madrid Castilla" as a reserve variant. Measured on the
 * table 2026-09-06, it was much worse than that: the pool for Barcelona
 * offered 448 different players and 194 of them ever played for Barcelona,
 * because the same match also returns RCD Espanyol Barcelona (427 rows) and
 * Barcelona SC Guayaquil. Porto offered 410 against 221, most of the excess
 * being Gremio Foot-Ball Porto Alegrense. Arsenal picked up Arsenal Tula and
 * Arsenal Kyiv, Liverpool picked up Liverpool FC Montevideo, and Newcastle
 * picked up Newcastle United Jets, who play in Australia.
 *
 * That is the shape Transfer Path was fixed for in Round 294: the game
 * SUGGESTS a name and its own validator then refuses it. Here the player
 * types three letters, takes the name the game offered him, and is told it is
 * wrong, which reads as the game being broken rather than the player being.
 *
 * Reserve and academy sides are deliberately absent (Real Madrid Castilla, FC
 * Porto B, Ajax Amsterdam U21, Juventus Next Gen, FC Barcelona Atletic): they
 * are different teams. Five clubs are stored under two names and both are
 * listed. A season split between two clubs is stored as "A / B" and an exact
 * match misses those, which costs 37 rows out of 15,444 (0.24 percent): those
 * men can still be typed in full and the validator still accepts them, they
 * are simply not suggested.
 *
 * THIS LIST IS DUPLICATED in supabase/functions/validate-player/index.ts,
 * which cannot import from src. simValidatePlayerRecords section 7 holds the
 * two copies identical, the same way simSchema holds the home page's JSON-LD
 * against the registry's.
 */
export const CLUB_TABLE_NAMES: Record<string, string[]> = {
  'Real Madrid': ['Real Madrid'],
  'Barcelona': ['FC Barcelona'],
  'Manchester City': ['Manchester City'],
  'Liverpool': ['Liverpool FC'],
  'Bayern Munich': ['Bayern Munich', 'FC Bayern Munich'],
  'PSG': ['Paris Saint-Germain'],
  'Chelsea': ['Chelsea FC'],
  'Arsenal': ['Arsenal FC'],
  'Manchester United': ['Manchester United'],
  'Juventus': ['Juventus FC', 'Juventus'],
  'AC Milan': ['AC Milan'],
  'Inter Milan': ['Inter Milan'],
  'Borussia Dortmund': ['Borussia Dortmund'],
  'Atlético Madrid': ['Atlético de Madrid'],
  'Tottenham': ['Tottenham Hotspur'],
  'Napoli': ['SSC Napoli', 'Napoli'],
  'Benfica': ['SL Benfica'],
  'Porto': ['FC Porto'],
  'Ajax': ['Ajax Amsterdam'],
  'Bayer Leverkusen': ['Bayer 04 Leverkusen'],
  'Roma': ['AS Roma', 'Roma'],
  'Sevilla': ['Sevilla FC', 'Sevilla'],
  'Sporting CP': ['Sporting CP'],
  'Newcastle': ['Newcastle United'],
  'Aston Villa': ['Aston Villa'],
  'West Ham': ['West Ham United'],
  'Marseille': ['Olympique Marseille'],
  'Lyon': ['Olympique Lyon'],
  'Celtic': ['Celtic FC'],
  'Galatasaray': ['Galatasaray'],
};

/** The exact stored club names for a club label, for an `in` filter. */
export function clubTableNames(clubName: string): string[] {
  return CLUB_TABLE_NAMES[clubName] ?? [clubName];
}

/**
 * Round 442. The nation filter is an exact `eq` on player_market_values
 * .nationality, and two of the 25 nations above are spelled differently in the
 * table, so the search box came back empty for every letter typed and the slot
 * was a dead end. Measured on flawuiqbvjobmkfkauhw, 2026-09-04:
 * nationality = 'USA' returns 0 players and 'United States' returns 349;
 * 'South Korea' returns 0 and 'Korea, South' returns 175. The spinner deals 11
 * of the 55 teams per game, so one of the two turned up in about 36% of games
 * and handed the player a slot he could not fill by any spelling.
 *
 * The labels stay as they are: they are what the flag strip and the copy show.
 * Only the query term changes, the same way the club aliases above work.
 */
const NATION_SEARCH_ALIASES: Record<string, string> = {
  'USA': 'United States',
  'South Korea': 'Korea, South',
};

/** Returns the exact value to filter player_market_values.nationality by. */
export function nationSearchTerm(nationName: string): string {
  return NATION_SEARCH_ALIASES[nationName] ?? nationName;
}
