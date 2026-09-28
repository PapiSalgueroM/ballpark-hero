/**
 * Round 646: what a Connect 4 game records, one rule for all five sports
 * (soccer, MLB, NBA, NFL, NHL). A win pays the top number and a draw pays
 * less; the soccer board is two players on one device and pays the win to
 * whichever side connects.
 */
export const CONNECT4_WIN_POINTS = 500;
export const CONNECT4_DRAW_POINTS = 200;

/**
 * The most a Connect 4 game can record: a win, 500. game_score_caps holds it
 * for every *-connect-4 key (scripts/simCapsAreCeilings.mjs).
 */
export const CONNECT4_CEILING = Math.max(CONNECT4_WIN_POINTS, CONNECT4_DRAW_POINTS);
