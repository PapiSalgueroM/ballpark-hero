import type { GameContent, GameContentMap } from './types';

/**
 * Round 210: the on-page guides load one sport at a time.
 *
 * Every game page rendered the guide block below the fold, and that block
 * imported the merged GAME_CONTENT map, which is every word of prose for
 * every game on the site: 344KB of source, 101KB gzipped, on a soccer page
 * that needs one entry of it. A phone on mobile data paid for the hockey
 * copy, the college copy and the baseball copy to read about a soccer
 * game.
 *
 * So the map is not merged eagerly any more. This file knows which sport
 * file owns each route, which is a hundred and seven short strings, and
 * fetches only that one. The whole site is still client rendered, so a
 * crawler already had to run JavaScript and fetch chunks to see any of
 * this at all; it now fetches one chunk more and a great deal less of it.
 *
 * PATH_BUNDLE is generated from the sport files themselves and checked
 * against them on every suite run by simSeoWeight, so it cannot drift: a
 * new game whose guide is not reachable is a failure, not a silent blank.
 */
export type ContentBundle =
  | 'soccer1' | 'soccer2' | 'football' | 'college' | 'basketball'
  | 'baseball' | 'hockey' | 'moreSports' | 'world';

/** Which sport file holds each route's guide. */
export const PATH_BUNDLE: Record<string, ContentBundle> = {
  /* baseball */
  '/baseball-career': 'baseball',
  '/baseball-connections': 'baseball',
  '/conquest-mlb': 'baseball',
  '/missing-nine': 'baseball',
  '/mlb-connect-4': 'baseball',
  '/mlb-front-office': 'baseball',
  '/mlb-grid': 'baseball',
  '/mlb-higher-lower': 'baseball',
  '/mlb-my-career': 'baseball',
  '/perfect-season-mlb': 'baseball',
  /* basketball */
  '/conquest-nba': 'basketball',
  '/missing-five': 'basketball',
  '/nba-career': 'basketball',
  '/nba-chain': 'basketball',
  '/nba-connect-4': 'basketball',
  '/nba-connections': 'basketball',
  '/nba-front-office': 'basketball',
  '/nba-grid': 'basketball',
  '/nba-higher-lower': 'basketball',
  '/nba-my-career': 'basketball',
  '/nba-starting-5': 'basketball',
  '/nba-stat-line': 'basketball',
  '/perfect-lineup-nba': 'basketball',
  '/perfect-season-nba': 'basketball',
  '/stat-detective': 'basketball',
  /* college */
  '/cbb-dynasty': 'college',
  '/cfb-dynasty': 'college',
  '/cfb-higher-lower': 'college',
  '/college-grid': 'college',
  '/cbb-grid': 'college',
  '/guess-cbb-team': 'college',
  '/guess-the-college': 'college',
  /* football */
  '/conquest': 'football',
  '/football-grid': 'football',
  '/front-office': 'football',
  '/missing-eleven': 'football',
  '/nfl-career': 'football',
  '/nfl-connect-4': 'football',
  '/nfl-connections': 'football',
  '/nfl-higher-lower': 'football',
  '/nfl-my-career': 'football',
  '/perfect-season-nfl': 'football',
  /* hockey */
  '/conquest-nhl': 'hockey',
  '/hockey-career': 'hockey',
  '/hockey-grid': 'hockey',
  '/hockey-higher-lower': 'hockey',
  '/nhl-connect-4': 'hockey',
  '/nhl-connections': 'hockey',
  '/nhl-front-office': 'hockey',
  '/nhl-my-career': 'hockey',
  '/perfect-lineup-nhl': 'hockey',
  '/perfect-season-nhl': 'hockey',
  '/puck-detective': 'hockey',
  /* moreSports */
  '/afl-higher-lower': 'moreSports',
  '/f1-constructor': 'moreSports',
  '/f1-driver': 'moreSports',
  '/f1-higher-lower': 'moreSports',
  '/golf-higher-lower': 'moreSports',
  '/guess-nascar-driver': 'moreSports',
  '/guess-tennis-player': 'moreSports',
  '/guess-the-golfer': 'moreSports',
  '/nascar-chain': 'moreSports',
  '/perfect-lineup-f1': 'moreSports',
  '/tennis-chain': 'moreSports',
  '/tennis-higher-lower': 'moreSports',
  '/ufc': 'moreSports',
  '/ufc-chain': 'moreSports',
  /* soccer1 */
  '/alphabet-sprint': 'soccer1',
  '/budget-builder': 'soccer1',
  '/career-ladder': 'soccer1',
  '/club-manager': 'soccer1',
  '/clue-auction': 'soccer1',
  '/dart-draft': 'soccer1',
  '/missing-xi': 'soccer1',
  '/player-bingo': 'soccer1',
  '/rarity-round': 'soccer1',
  '/rebuild': 'soccer1',
  '/sports-bingo': 'soccer1',
  '/who-am-i': 'soccer1',
  '/world-xi': 'soccer1',
  /* soccer2 */
  '/build-your-xi': 'soccer2',
  '/career': 'soccer2',
  '/connections': 'soccer2',
  '/fantasy-draft': 'soccer2',
  '/football-connect-4': 'soccer2',
  '/footle': 'soccer2',
  '/gauntlet-draft': 'soccer2',
  '/higher-lower': 'soccer2',
  '/player-stock-market': 'soccer2',
  '/sign-the-player': 'soccer2',
  '/soccer-career': 'soccer2',
  '/soccer-grid': 'soccer2',
  '/search-and-discard': 'soccer2',
  '/squad-deal': 'soccer2',
  '/stadium-tycoon': 'soccer2',
  '/wonderkid-factory': 'soccer2',
  '/transfer-path': 'soccer2',
  '/world-cup-bracket': 'soccer2',
  /* world */
  '/ball-iq': 'world',
  '/champ-or-not': 'world',
  '/whod-they-beat': 'world',
  '/silverware-sort': 'world',
  '/hall-of-champions': 'world',
  '/emoji-guess': 'world',
  '/face-off': 'world',
  '/guess-the-nation': 'world',
  '/guess-the-year': 'world',
  '/hof-or-bust': 'world',
  '/idle-arena': 'world',
  '/quiz-board': 'world',
  '/list-quiz': 'world',
  '/minefield': 'world',
  '/mystery-box': 'world',
  '/olympics': 'world',
  '/rank-em': 'world',
  '/score-predictor': 'world',
  '/sports-millionaire': 'world',
  '/teammates': 'world',
};

/** One dynamic import per sport file. Rollup splits each into its own chunk. */
const LOADERS: Record<ContentBundle, () => Promise<Record<string, GameContentMap>>> = {
  soccer1: () => import('./soccer1'),
  soccer2: () => import('./soccer2'),
  football: () => import('./football'),
  college: () => import('./college'),
  basketball: () => import('./basketball'),
  baseball: () => import('./baseball'),
  hockey: () => import('./hockey'),
  moreSports: () => import('./moreSports'),
  world: () => import('./world'),
};

/* A sport file, once fetched, is kept: moving between two soccer games
   should not fetch the same prose twice. */
const cache = new Map<ContentBundle, GameContentMap>();

/** The guide for one route, or null when that route has no guide. */
export async function loadGameContent(path: string): Promise<GameContent | null> {
  const bundle = PATH_BUNDLE[path];
  if (!bundle) return null;
  let map = cache.get(bundle);
  if (!map) {
    const mod = await LOADERS[bundle]();
    /* Each file exports exactly one record under its own name, so the
       first export IS the map. Reading it positionally keeps this file
       from having to know nine export names that add nothing. */
    map = Object.values(mod)[0] as GameContentMap;
    cache.set(bundle, map);
  }
  return map[path] ?? null;
}
