/* Round 1541: the men's international basketball summers NBA My Career can
 * reach, the Olympics and the World Cup (played as the World Championship up
 * to 2010), from Athens 2004 to Brisbane 2032.
 *
 * EVERY ROW IS SOURCED. scripts/data/basketballIntlSources.json holds two
 * reads a fact (an edition's year and host, its name, its shape, its field,
 * its finishing places, and the two game lengths), on two hosts that are not
 * each other, none a wiki, with the words each page printed and the day it
 * was read. scripts/simCareerIntl.mjs section 1 holds these rows equal to
 * that ledger. Nothing here is typed from memory.
 *
 * NATIONS AS THEY PLAYED. Serbia and Montenegro is Serbia and Montenegro,
 * never today's Serbia. Names are the FLAG_CODES keys of
 * src/components/FlagImg.tsx where one exists ("USA", "South Korea",
 * "Ivory Coast", "Czech Republic"); Puerto Rico and Serbia and Montenegro
 * have no entry there and render as their name.
 *
 * IDS ARE SAVE KEYS. An edition id is the competition and the summer it was
 * played ('oly-2021' for the Tokyo Games of 2020, held in 2021), the same id
 * for a projected summer the real world later names, never carrying the host,
 * and never renamed: a save's summer rows point at it.
 *
 * THIN DATA. A fact short of two reads puts its edition in
 * BASKETBALL_INTL_PARTIAL, the CM_PARTIAL shape; its reason is in the ledger.
 * Today that is the four editions still to come, whose competition systems
 * are not published: each plays the last verified shape of its competition.
 *
 * NO FIELD IS INVENTED. An edition still to come has field null and the game
 * draws one by its own rule (src/lib/careerIntl.ts), said on screen as the
 * game's own. BASKETBALL_LAST_PLAYED_SUMMER is a real world fact read off
 * this ledger, never computed from a clock; moving it is a data round (the
 * 2027 World Cup final, 12 September 2027, is the day it goes stale).
 *
 * PROJECTED SUMMERS. Past the last ledgered edition of a competition the
 * game keeps its own calendar, BASKETBALL_INTL_CYCLES: an Olympics every
 * year divisible by four from 2036 and a World Cup every year one short of
 * that from 2035, the cycle the ledger's 2019 to 2031 rows already show. No
 * host, a field the game draws, the last verified shape.
 *
 * THE RULE. Pure data, imports nothing, so it can never join an import cycle.
 * Tuples, no prose: the sources live in the JSON ledger.
 */

export const BASKETBALL_INTL_VERIFIED_ON = '2026-10-22';

/** The last summer an edition in this ledger was played. A data round moves it. */
export const BASKETBALL_LAST_PLAYED_SUMMER = 2024;

/** A FIBA game is 40 minutes and an NBA game 48 (the ledger's `rules`). */
export const FIBA_GAME_MINUTES = 40;
export const NBA_GAME_MINUTES = 48;

export type BasketballIntlComp = 'oly' | 'wc';
export type BasketballIntlName = 'Olympics' | 'World Championship' | 'Basketball World Cup';

/**
 * A shape: id, teams, groups, group size, through per group, best thirds
 * through, the first knockout round, a bronze game, playable by the engine,
 * and the shape the game plays instead when it is not.
 */
export type BasketballShapeRow = readonly [
  id: string, teams: number, groups: number, groupSize: number, through: number,
  thirdsThrough: number, firstKnockout: 'R16' | 'QF' | 'SF', bronze: boolean,
  playable: boolean, playedAs: string | null,
];

export const BASKETBALL_INTL_SHAPES: readonly BasketballShapeRow[] = [
  ['oly-2x6', 12, 2, 6, 4, 0, 'QF', true, true, null],
  ['oly-3x4', 12, 3, 4, 2, 2, 'QF', true, true, null],
  ['wc-4x6', 24, 4, 6, 4, 0, 'R16', true, true, null],
  // 2019 and 2023: a second group round of four groups of four, its top two to
  // the quarter-finals. The engine plays one group round, so the game plays
  // these as eight groups of four into a round of 16 (game-8x4), and says so.
  ['wc-8x4-2r', 32, 8, 4, 2, 0, 'QF', true, false, 'game-8x4'],
  ['game-8x4', 32, 8, 4, 2, 0, 'R16', true, true, null],
];

/** gold, silver, bronze, fourth, the other quarter-finalists. */
export type BasketballRungs = readonly [string, string, string, string, readonly string[]];

/**
 * An edition: id, competition, the summer it was played, its name, its host,
 * its shape, its field (null when still to come), its finishing places (null
 * when still to come), and the Olympiad year when it differs from the summer.
 */
export type BasketballEditionRow = readonly [
  id: string, comp: BasketballIntlComp, year: number, name: BasketballIntlName,
  host: string, shape: string, field: readonly string[] | null,
  rungs: BasketballRungs | null, games?: number,
];

export const BASKETBALL_INTL_EDITIONS: readonly BasketballEditionRow[] = [
  ['oly-2004', 'oly', 2004, 'Olympics', 'Athens', 'oly-2x6',
    ['Argentina', 'Italy', 'USA', 'Lithuania', 'Greece', 'Puerto Rico', 'Spain', 'China', 'Australia', 'New Zealand', 'Serbia and Montenegro', 'Angola'],
    ['Argentina', 'Italy', 'USA', 'Lithuania', ['Spain', 'China', 'Puerto Rico', 'Greece']]],
  ['wc-2006', 'wc', 2006, 'World Championship', 'Japan', 'wc-4x6',
    ['Venezuela', 'Lebanon', 'Serbia and Montenegro', 'Nigeria', 'Argentina', 'France', 'Germany', 'Japan', 'Angola', 'Panama', 'Spain', 'New Zealand',
      'Brazil', 'Australia', 'Greece', 'Qatar', 'Turkey', 'Lithuania', 'Puerto Rico', 'USA', 'Slovenia', 'Senegal', 'Italy', 'China'],
    ['Spain', 'Greece', 'USA', 'Argentina', ['Lithuania', 'Turkey', 'France', 'Germany']]],
  ['oly-2008', 'oly', 2008, 'Olympics', 'Beijing', 'oly-2x6',
    ['USA', 'Spain', 'Argentina', 'Lithuania', 'Croatia', 'China', 'Australia', 'Greece', 'Russia', 'Iran', 'Germany', 'Angola'],
    ['USA', 'Spain', 'Argentina', 'Lithuania', ['Croatia', 'China', 'Australia', 'Greece']]],
  ['wc-2010', 'wc', 2010, 'World Championship', 'Turkey', 'wc-4x6',
    ['Argentina', 'Angola', 'Australia', 'Germany', 'Jordan', 'Serbia', 'Brazil', 'Croatia', 'Iran', 'Slovenia', 'Tunisia', 'USA',
      'China', 'Greece', 'Ivory Coast', 'Puerto Rico', 'Russia', 'Turkey', 'Canada', 'France', 'Lebanon', 'Lithuania', 'New Zealand', 'Spain'],
    ['USA', 'Turkey', 'Lithuania', 'Serbia', ['Spain', 'Slovenia', 'Russia', 'Argentina']]],
  ['oly-2012', 'oly', 2012, 'Olympics', 'London', 'oly-2x6',
    ['USA', 'France', 'Argentina', 'Lithuania', 'Nigeria', 'Tunisia', 'Russia', 'Brazil', 'Spain', 'Australia', 'Great Britain', 'China'],
    ['USA', 'Spain', 'Russia', 'Argentina', ['Brazil', 'Australia', 'France', 'Lithuania']]],
  ['wc-2014', 'wc', 2014, 'Basketball World Cup', 'Spain', 'wc-4x6',
    ['Spain', 'France', 'Brazil', 'Serbia', 'Iran', 'Egypt', 'Greece', 'Argentina', 'Croatia', 'Puerto Rico', 'Senegal', 'Philippines',
      'USA', 'Turkey', 'Ukraine', 'Dominican Republic', 'New Zealand', 'Finland', 'Lithuania', 'Slovenia', 'Australia', 'Mexico', 'Angola', 'South Korea'],
    ['USA', 'Serbia', 'France', 'Lithuania', ['Spain', 'Brazil', 'Slovenia', 'Turkey']]],
  ['oly-2016', 'oly', 2016, 'Olympics', 'Rio de Janeiro', 'oly-2x6',
    ['USA', 'Australia', 'France', 'Serbia', 'Venezuela', 'China', 'Croatia', 'Spain', 'Lithuania', 'Argentina', 'Brazil', 'Nigeria'],
    ['USA', 'Serbia', 'Spain', 'Australia', ['Croatia', 'France', 'Lithuania', 'Argentina']]],
  ['wc-2019', 'wc', 2019, 'Basketball World Cup', 'China', 'wc-8x4-2r',
    ['Poland', 'Venezuela', 'Ivory Coast', 'China', 'Russia', 'Nigeria', 'South Korea', 'Argentina', 'Iran', 'Puerto Rico', 'Spain', 'Tunisia',
      'Angola', 'Serbia', 'Philippines', 'Italy', 'Czech Republic', 'USA', 'Turkey', 'Japan', 'New Zealand', 'Brazil', 'Greece', 'Montenegro',
      'Dominican Republic', 'Jordan', 'France', 'Germany', 'Canada', 'Australia', 'Senegal', 'Lithuania'],
    ['Spain', 'Argentina', 'France', 'Australia', ['Serbia', 'Poland', 'USA', 'Czech Republic']]],
  ['oly-2021', 'oly', 2021, 'Olympics', 'Tokyo', 'oly-3x4',
    ['France', 'USA', 'Czech Republic', 'Iran', 'Australia', 'Italy', 'Germany', 'Nigeria', 'Slovenia', 'Spain', 'Argentina', 'Japan'],
    ['USA', 'France', 'Australia', 'Slovenia', ['Germany', 'Spain', 'Italy', 'Argentina']], 2020],
  ['wc-2023', 'wc', 2023, 'Basketball World Cup', 'Indonesia, Japan and the Philippines', 'wc-8x4-2r',
    ['Italy', 'Dominican Republic', 'Angola', 'Philippines', 'South Sudan', 'Puerto Rico', 'China', 'Serbia', 'Jordan', 'Greece', 'USA', 'New Zealand',
      'Mexico', 'Montenegro', 'Egypt', 'Lithuania', 'Finland', 'Australia', 'Germany', 'Japan', 'Cape Verde', 'Georgia', 'Slovenia', 'Venezuela',
      'Iran', 'Brazil', 'Spain', 'Ivory Coast', 'Latvia', 'Lebanon', 'Canada', 'France'],
    ['Germany', 'Serbia', 'Canada', 'USA', ['Italy', 'Lithuania', 'Latvia', 'Slovenia']]],
  ['oly-2024', 'oly', 2024, 'Olympics', 'Paris', 'oly-3x4',
    ['Canada', 'Australia', 'Greece', 'Spain', 'Germany', 'France', 'Brazil', 'Japan', 'USA', 'Serbia', 'South Sudan', 'Puerto Rico'],
    ['USA', 'France', 'Serbia', 'Germany', ['Canada', 'Greece', 'Brazil', 'Australia']]],
  ['wc-2027', 'wc', 2027, 'Basketball World Cup', 'Qatar', 'wc-8x4-2r', null, null],
  ['oly-2028', 'oly', 2028, 'Olympics', 'Los Angeles', 'oly-3x4', null, null],
  ['wc-2031', 'wc', 2031, 'Basketball World Cup', 'France', 'wc-8x4-2r', null, null],
  ['oly-2032', 'oly', 2032, 'Olympics', 'Brisbane', 'oly-3x4', null, null],
];

/** Editions with a fact short of two reads; the reason is in the ledger. */
export const BASKETBALL_INTL_PARTIAL: string[] = ['wc-2027', 'oly-2028', 'wc-2031', 'oly-2032'];

/**
 * The game's own calendar past the ledger: competition, the first projected
 * summer, every how many years. Its shape and name are the last ledgered
 * edition's of that competition.
 */
export const BASKETBALL_INTL_CYCLES: readonly (readonly [BasketballIntlComp, number, number])[] = [
  ['oly', 2036, 4],
  ['wc', 2035, 4],
];
