export interface YearPuzzle {
  year: number;
  clues: string[];
}

export interface GuessTheYearState {
  puzzle: YearPuzzle;
  revealedClues: number;
  guesses: number[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
}

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
/** Round 646: the most a game on this clue ladder can record, a right guess on
    the first clue, the top of POINTS_BY_CLUE. game_score_caps holds it for
    this game (scripts/simCapsAreCeilings.mjs). */
export const SCORE_CEILING = Math.max(...POINTS_BY_CLUE);
