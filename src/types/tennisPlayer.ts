export interface TennisPlayerPuzzle {
  id: string;
  player_name: string;
  common_names: string[];
  clues: string[];
}

export interface TennisPlayerState {
  puzzle: TennisPlayerPuzzle;
  revealedClues: number;
  guesses: string[];
  gameStatus: 'playing' | 'won' | 'lost';
  score: number;
  mode: 'daily' | 'unlimited';
}

export const MAX_CLUES = 6;

export const POINTS_BY_CLUE = [1000, 800, 600, 400, 200, 100];
/** Round 646: the most a game on this clue ladder can record, a right guess on
    the first clue, the top of POINTS_BY_CLUE. game_score_caps holds it for
    this game (scripts/simCapsAreCeilings.mjs). */
export const SCORE_CEILING = Math.max(...POINTS_BY_CLUE);
