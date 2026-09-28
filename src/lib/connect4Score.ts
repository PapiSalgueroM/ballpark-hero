/**
 * Round 646: what a Connect 4 game records, one rule for all five sports
 * (soccer, MLB, NBA, NFL, NHL). A win pays the top number and a draw pays
 * less; the soccer board is two players on one device, records only a board
 * somebody connected, and pays the win to whichever side connects.
 */
export const CONNECT4_WIN_POINTS = 500;
export const CONNECT4_DRAW_POINTS = 200;

export type Connect4Outcome = 'won' | 'draw' | 'lost';

/** What a finished board records. The five recorders call this. */
export function connect4Score(outcome: Connect4Outcome): number {
  return outcome === 'won' ? CONNECT4_WIN_POINTS : outcome === 'draw' ? CONNECT4_DRAW_POINTS : 0;
}

/**
 * The most a Connect 4 game can record: a win, through the rule above, 500.
 * game_score_caps holds it for every *-connect-4 key
 * (scripts/simCapsAreCeilings.mjs).
 */
export const CONNECT4_CEILING = connect4Score('won');
